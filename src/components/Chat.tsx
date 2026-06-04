"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types";
import {
  isSTTSupported,
  isTTSSupported,
  createLiveConversation,
  speak,
  cancelSpeech,
  getAvailableVoices,
  onVoicesLoaded,
} from "@/lib/voice/speech";
import {
  resolveStoredVoice,
  pickDefaultVoice,
} from "@/lib/voice/preferences";

type ConversationState =
  | "idle"           // Not in voice mode
  | "listening"     // Mic on, capturing speech
  | "thinking"      // User finished, sending to model
  | "responding";   // Model streaming + TTS speaking

interface ChatProps {
  sessionId: string;
  systemPrompt: string;
  initialMessages?: ChatMessage[];
  onEndSession?: () => void;
  placeholder?: string;
}

export default function Chat({
  sessionId,
  systemPrompt,
  initialMessages = [],
  onEndSession,
  placeholder = "Type your message...",
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice conversation state
  const [voiceState, setVoiceState] = useState<ConversationState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveConversationRef = useRef<ReturnType<typeof createLiveConversation> | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  const sttSupported = isSTTSupported();
  const ttsSupported = isTTSSupported();
  const voiceSupported = sttSupported && ttsSupported;
  const inVoiceMode = voiceState !== "idle";

    // Refs that always point to latest state — avoid stale closures in callbacks
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const isStreamingRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Auto-scroll to bottom when new messages or transcripts arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveConversationRef.current?.stop();
      cancelSpeech();
    };
  }, []);

  // Load voice preference from localStorage (or fall back to default)
  useEffect(() => {
    if (!ttsSupported) return;

    const loadVoice = () => {
      const voices = getAvailableVoices();
      if (voices.length === 0) return;

      // Try stored preference first, then sensible default
      const voice = resolveStoredVoice(voices) || pickDefaultVoice(voices);
      if (voice) setSelectedVoice(voice);
    };

    const unsubscribe = onVoicesLoaded(loadVoice);
    return unsubscribe;
  }, [ttsSupported]);


    // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);
  // Keep the voice ref in sync with state (avoids stale closure issues)
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // ============================================
  // CORE: send a message (used by both text and voice modes)
  // ============================================
 const sendMessage = useCallback(
    async (text: string, isVoiceTurn: boolean = false): Promise<void> => {
      const trimmed = text.trim();
      // Read from ref — always latest
      if (!trimmed || isStreamingRef.current) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      // Read from ref — always latest message history
      const currentMessages = messagesRef.current;
      const newMessages = [...currentMessages, userMessage];

      setMessages(newMessages);
      setInput("");
      setInterimTranscript("");
      setIsStreaming(true);
      setError(null);

      if (isVoiceTurn) setVoiceState("thinking");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            systemPrompt,
            sessionId,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `Request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let assistantContent = "";

        if (isVoiceTurn) setVoiceState("responding");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantContent,
            };
            return updated;
          });
        }

        if (isVoiceTurn && ttsSupported && assistantContent.trim()) {
          cancelSpeechRef.current = speak(assistantContent, {
            voice: selectedVoiceRef.current,
            onEnd: () => {
              setTimeout(() => {
                if (liveConversationRef.current?.isRunning()) {
                  setVoiceState("listening");
                  liveConversationRef.current.resume();
                }
              }, 500);
            },
            onError: (err) => {
              console.warn("TTS error:", err);
              setTimeout(() => {
                if (liveConversationRef.current?.isRunning()) {
                  setVoiceState("listening");
                  liveConversationRef.current.resume();
                }
              }, 500);
            },
          });
        }
      } catch (err) {
        console.error("Chat error:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
        setMessages((prev) => prev.slice(0, -1));
        if (isVoiceTurn) setVoiceState("listening");
      } finally {
        setIsStreaming(false);
      }
    },
    [systemPrompt, sessionId, ttsSupported],  // ← shorter dependency list
  );

  // ============================================
  // VOICE MODE CONTROLS
  // ============================================
  function startVoiceConversation() {
    if (!voiceSupported) {
      setError("Voice mode requires Chrome or Edge.");
      return;
    }

    setError(null);
    setInterimTranscript("");

    const controller = createLiveConversation(
      {
        onInterimTranscript: (text) => {
          setInterimTranscript(text);
        },
        onFinalTranscript: (text) => {
           // Pause the mic IMMEDIATELY before sending — prevents echo
            liveConversationRef.current?.pause();
            setInterimTranscript("");
            sendMessage(text, true);
        },
        onListeningStart: () => {
          setVoiceState("listening");
        },
        onError: (err) => {
          // Ignore benign errors
          if (err === "no-speech" || err === "aborted") return;
          setError(`Voice error: ${err}`);
        },
      },
      2000, // 2 second silence threshold (good for therapy pauses)
    );

    if (controller) {
      liveConversationRef.current = controller;
      controller.start();
    }
  }

  function stopVoiceConversation() {
    liveConversationRef.current?.stop();
    liveConversationRef.current = null;
    cancelSpeechRef.current?.();
    cancelSpeech();
    setVoiceState("idle");
    setInterimTranscript("");
  }

  // ============================================
  // TEXT MODE SUBMIT
  // ============================================
  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    await sendMessage(input, false);
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border bg-white">
      {/* Voice mode status bar */}
      {inVoiceMode && (
        <VoiceStatusBar state={voiceState} onStop={stopVoiceConversation} />
      )}


      {/* Messages area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && !interimTranscript && (
          <div className="text-center text-sm text-gray-400">
            Send a message or start a voice conversation to begin.
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {/* Live interim transcript (shown while user is speaking) */}
        {interimTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg bg-blue-100 px-4 py-2 text-sm italic text-blue-900">
              {interimTranscript}
              <span className="ml-1 inline-block animate-pulse">▍</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            Error: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom controls */}
      {inVoiceMode ? (
        // Voice mode active — show simplified controls
        <div className="border-t bg-gray-50 p-4">
          <div className="text-center text-sm text-gray-600">
            Voice conversation active. Just speak — your message will send when you pause.
          </div>
        </div>
      ) : (
        // Text mode — show input + voice start button
        <form
          onSubmit={handleTextSubmit}
          className="flex items-end gap-2 border-t bg-gray-50 p-4"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit(e);
              }
            }}
            placeholder={placeholder}
            disabled={isStreaming}
            rows={2}
            suppressHydrationWarning
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />

          {/* Start voice conversation button */}
          {voiceSupported && (
            <button
              type="button"
              onClick={startVoiceConversation}
              disabled={isStreaming}
              title="Start live voice conversation"
              suppressHydrationWarning
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              🎤 Voice
            </button>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            suppressHydrationWarning
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isStreaming ? "..." : "Send"}
          </button>

          {onEndSession && (
            <button
              type="button"
              onClick={onEndSession}
              disabled={isStreaming}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              End
            </button>
          )}
        </form>
      )}

      {/* Browser compatibility notice */}
      {!voiceSupported && (
        <div className="border-t bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
          ⚠️ Voice mode requires Chrome or Edge. You can still chat by text.
        </div>
      )}
    </div>
  );
}

// ============================================
// SUBCOMPONENTS
// ============================================

function VoiceStatusBar({
  state,
  onStop,
}: {
  state: ConversationState;
  onStop: () => void;
}) {
  const statusConfig = {
    listening: {
      icon: "🎤",
      text: "Listening — speak when ready",
      bg: "bg-green-50",
      textColor: "text-green-900",
    },
    thinking: {
      icon: "💭",
      text: "Thinking...",
      bg: "bg-yellow-50",
      textColor: "text-yellow-900",
    },
    responding: {
      icon: "🔊",
      text: "Speaking...",
      bg: "bg-blue-50",
      textColor: "text-blue-900",
    },
    idle: { icon: "", text: "", bg: "", textColor: "" },
  };

  const config = statusConfig[state];

  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-3 ${config.bg}`}
    >
      <div className={`flex items-center gap-2 text-sm font-medium ${config.textColor}`}>
        <span className="text-base">{config.icon}</span>
        <span>{config.text}</span>
      </div>
      <button
        onClick={onStop}
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
      >
        Stop Conversation
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.content || (
          <span className="inline-block animate-pulse text-gray-400">…</span>
        )}
      </div>
    </div>
  );
}