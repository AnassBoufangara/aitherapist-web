/**
 * Voice helper module for live conversation mode.
 *
 * Architecture:
 * - Continuous speech recognition with interim results
 * - Silence detection auto-triggers send after pause
 * - TTS playback with completion callback for loop continuation
 *
 * Browser support:
 * - STT: Chrome/Edge/Brave only (Chromium)
 * - TTS: All major browsers
 */

// ============================================
// TYPE DECLARATIONS
// ============================================
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ============================================
// CAPABILITY DETECTION
// ============================================

export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isTTSSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

/**
 * Get list of available TTS voices on this device.
 * Useful for letting users pick a less-robotic voice.
 *
 * Note: Some browsers (Chrome) populate voices asynchronously.
 * Returns empty array on first call sometimes — listen for 'voiceschanged' event.
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
}

/**
 * Register a callback for when voices become available.
 * Chrome loads them asynchronously, so we need to wait.
 */
export function onVoicesLoaded(callback: () => void): () => void {
  if (!isTTSSupported()) return () => {};
  // Some voices might already be loaded
  if (window.speechSynthesis.getVoices().length > 0) {
    callback();
  }
  const handler = () => callback();
  window.speechSynthesis.addEventListener("voiceschanged", handler);
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", handler);
}

// ============================================
// LIVE CONVERSATION CONTROLLER
// ============================================

interface LiveConversationCallbacks {
  /** Called with interim (in-progress) transcripts as user speaks */
  onInterimTranscript: (text: string) => void;
  /** Called when user has paused long enough — submit this transcript */
  onFinalTranscript: (text: string) => void;
  /** Called when listening starts */
  onListeningStart?: () => void;
  /** Called when listening ends (manually or after final) */
  onListeningEnd?: () => void;
  /** Called on any error */
  onError?: (error: string) => void;
}

interface LiveConversationController {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRunning: () => boolean;
}

/**
 * Creates a controller for live continuous voice conversation.
 *
 * @param silenceThresholdMs - How long the user must pause before we auto-send.
 *                              Default 1800ms (1.8 seconds). Therapy patients pause to think,
 *                              so don't make this too short.
 */
export function createLiveConversation(
  callbacks: LiveConversationCallbacks,
  silenceThresholdMs: number = 1800,
): LiveConversationController | null {
  if (!isSTTSupported()) {
    callbacks.onError?.("Speech recognition not supported in this browser.");
    return null;
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  let recognition: SpeechRecognitionInstance | null = null;
  let running = false;
  let paused = false;  
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let accumulatedFinalTranscript = "";
  let lastInterimTranscript = "";

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function resetSilenceTimer() {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      // Don't fire onFinalTranscript if we've been paused
      if (paused) return;
      
      const fullText = (accumulatedFinalTranscript + " " + lastInterimTranscript).trim();
      if (fullText.length > 0) {
        callbacks.onFinalTranscript(fullText);
        accumulatedFinalTranscript = "";
        lastInterimTranscript = "";
      }
    }, silenceThresholdMs);
  }

    function startRecognition() {
        if (recognition) {
        try {
            recognition.abort();
        } catch {
            // ignore
        }
        }

        recognition = new SpeechRecognition!();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
        callbacks.onListeningStart?.();
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            // If we're paused, ignore any incoming audio — this prevents
            // capturing the agent's TTS playback during the pause window
            if (paused) {
                return;
            }

            let interim = "";
            let finalDelta = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                if (result.isFinal) {
                finalDelta += text;
                } else {
                interim += text;
                }
            }

            if (finalDelta) {
                accumulatedFinalTranscript += finalDelta;
            }
            lastInterimTranscript = interim;

            const combined = (accumulatedFinalTranscript + " " + interim).trim();
            callbacks.onInterimTranscript(combined);

            resetSilenceTimer();
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech" || event.error === "aborted") {
            return;
        }
        callbacks.onError?.(event.error);
        };

        // updated onend handler
        recognition.onend = () => {
        // Don't auto-restart if we're intentionally paused
        if (paused) {
            callbacks.onListeningEnd?.();
            return;
        }

        // Otherwise, if we're still running, restart (handles network blips)
        if (running) {
            try {
            startRecognition();
            } catch {
            running = false;
            callbacks.onListeningEnd?.();
            }
        } else {
            callbacks.onListeningEnd?.();
        }
        };

        try {
        recognition.start();
        } catch (err) {
        callbacks.onError?.(
            err instanceof Error ? err.message : "Failed to start recognition",
        );
        }
    }

   return {
    start: () => {
      if (running) return;
      running = true;
      paused = false;
      accumulatedFinalTranscript = "";
      lastInterimTranscript = "";
      startRecognition();
    },
    stop: () => {
      running = false;
      paused = false;
      clearSilenceTimer();
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
        recognition = null;
      }
      accumulatedFinalTranscript = "";
      lastInterimTranscript = "";
    },
    pause: () => {
      paused = true;
      // Stop the mic but remember we want to resume
      clearSilenceTimer();
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
        recognition = null;
      }
      accumulatedFinalTranscript = "";
      lastInterimTranscript = "";
    },
    resume: () => {
        paused = false; 
      // Restart the mic if we're still in conversation mode
      if (running && !recognition) {
        accumulatedFinalTranscript = "";
        lastInterimTranscript = "";
        startRecognition();
      }
    },
    isRunning: () => running,
  };
}

// ============================================
// TEXT-TO-SPEECH (TTS)
// ============================================

/**
 * Splits text into sentence-sized chunks for TTS playback.
 * Avoids Chrome's ~15-second cutoff on long utterances.
 */
function chunkTextBySentence(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g);

  if (!sentences) return [text];

  const chunks: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length <= 200) {
      chunks.push(trimmed);
    } else {
      const parts = trimmed.split(/,\s*/);
      let buffer = "";
      for (const part of parts) {
        if ((buffer + part).length > 200 && buffer) {
          chunks.push(buffer.trim());
          buffer = part;
        } else {
          buffer += (buffer ? ", " : "") + part;
        }
      }
      if (buffer) chunks.push(buffer.trim());
    }
  }
  return chunks.filter((c) => c.length > 0);
}

/**
 * Speaks the given text and calls onEnd when fully complete.
 * Returns a function to cancel mid-speech.
 */
export function speak(
  text: string,
  options?: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: string) => void;
  },
): (() => void) | null {
  if (!isTTSSupported()) {
    options?.onError?.("Text-to-speech not supported.");
    return null;
  }

  window.speechSynthesis.cancel();

  const chunks = chunkTextBySentence(text);
  if (chunks.length === 0) {
    options?.onEnd?.();
    return null;
  }

  let cancelled = false;
  let currentIndex = 0;

  const speakNextChunk = () => {
    if (cancelled || currentIndex >= chunks.length) {
      if (!cancelled) options?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
    utterance.lang = "en-US";
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    // Use the selected voice if provided
    if (options?.voice) {
      utterance.voice = options.voice;
    }

    utterance.onend = () => {
      currentIndex++;
      speakNextChunk();
    };

    utterance.onerror = (event) => {
      options?.onError?.(event.error || "TTS error");
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNextChunk();

  return () => {
    cancelled = true;
    window.speechSynthesis.cancel();
  };
}

export function cancelSpeech(): void {
  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}