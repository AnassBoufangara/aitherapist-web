"use client";

import { useState, useEffect } from "react";
import {
  getAvailableVoices,
  onVoicesLoaded,
  speak,
  cancelSpeech,
} from "@/lib/voice/speech";
import {
  getStoredVoiceName,
  setStoredVoiceName,
  pickDefaultVoice,
} from "@/lib/voice/preferences";

const PREVIEW_TEXT = "Hello, I'm here to listen. Take your time.";

interface VoicePickerProps {
  /** Called when user clicks Save with the chosen voice name */
  onSave: (voiceName: string) => void;
  /** Optional skip/cancel button label and handler */
  onSkip?: () => void;
  skipLabel?: string;
  saveLabel?: string;
  /** Heading text */
  title?: string;
  description?: string;
}

export default function VoicePicker({
  onSave,
  onSkip,
  skipLabel = "Skip",
  saveLabel = "Save voice preference",
  title = "Choose your therapist's voice",
  description = "Pick the voice you'd like to hear during sessions. You can change this anytime in settings.",
}: VoicePickerProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Load available voices (async in Chrome)
  useEffect(() => {
    const loadVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);

      // Pre-select: stored preference, or sensible default
      const stored = getStoredVoiceName();
      if (stored && available.find((v) => v.name === stored)) {
        setSelectedName(stored);
      } else {
        const fallback = pickDefaultVoice(available);
        if (fallback) setSelectedName(fallback.name);
      }
    };

    const unsubscribe = onVoicesLoaded(loadVoices);
    return () => {
      unsubscribe();
      cancelSpeech();
    };
  }, []);

  function handlePreview(voice: SpeechSynthesisVoice) {
    cancelSpeech();
    setPreviewingVoice(voice.name);
    speak(PREVIEW_TEXT, {
      voice,
      onEnd: () => setPreviewingVoice(null),
      onError: () => setPreviewingVoice(null),
    });
  }

  function handleSave() {
    if (!selectedName) return;
    setStoredVoiceName(selectedName);
    onSave(selectedName);
  }

  if (voices.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-600">
        Loading available voices...
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">{description}</p>

      <div className="mb-4 space-y-2">
        {voices.map((voice) => {
          const isSelected = selectedName === voice.name;
          const isPreviewing = previewingVoice === voice.name;
          return (
            <div
              key={voice.name}
              className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="voice"
                  value={voice.name}
                  checked={isSelected}
                  onChange={() => setSelectedName(voice.name)}
                  suppressHydrationWarning
                  className="cursor-pointer"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {voice.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {voice.lang}
                    {voice.localService ? " · Local" : " · Network"}
                  </div>
                </div>
              </label>

              <button
                type="button"
                onClick={() => handlePreview(voice)}
                disabled={isPreviewing}
                suppressHydrationWarning
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {isPreviewing ? "▶ Playing..." : "▶ Preview"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mb-4 text-xs italic text-gray-500">
        Preview plays: &quot;{PREVIEW_TEXT}&quot;
      </p>

      <div className="flex justify-end gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            {skipLabel}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedName}
          suppressHydrationWarning
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}