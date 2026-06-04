"use client";

import { useState } from "react";
import VoicePicker from "@/components/VoicePicker";
import { clearStoredVoiceName, getStoredVoiceName } from "@/lib/voice/preferences";

export default function SettingsPage() {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string | null>(
    typeof window !== "undefined" ? getStoredVoiceName() : null,
  );

  function handleSave(voiceName: string) {
    setCurrentVoice(voiceName);
    setSavedMessage(`Voice updated to "${voiceName}"`);
    setTimeout(() => setSavedMessage(null), 3000);
  }

  function handleReset() {
    if (!confirm("Reset voice preference to default?")) return;
    clearStoredVoiceName();
    setCurrentVoice(null);
    setSavedMessage("Voice preference reset");
    setTimeout(() => setSavedMessage(null), 3000);
  }

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Settings</h1>
      <p className="mb-8 text-sm text-gray-600">
        Manage your preferences for the platform.
      </p>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Voice Preference
          </h2>
          {currentVoice && (
            <button
              onClick={handleReset}
              className="text-xs text-red-600 hover:underline"
            >
              Reset to default
            </button>
          )}
        </div>

        {currentVoice && (
          <div className="mb-4 rounded-md bg-gray-100 p-3 text-sm text-gray-700">
            Current voice: <strong>{currentVoice}</strong>
          </div>
        )}

        {savedMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
            ✓ {savedMessage}
          </div>
        )}

        <VoicePicker
          title="Choose a voice"
          description="Preview each voice, then save your preference."
          saveLabel="Save voice preference"
          onSave={handleSave}
        />
      </section>
    </div>
  );
}