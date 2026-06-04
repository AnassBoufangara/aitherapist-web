"use client";

import { useState, useEffect } from "react";
import VoicePicker from "./VoicePicker";
import {
  hasUserSetVoicePreference,
  setStoredVoiceName,
} from "@/lib/voice/preferences";
import { isTTSSupported } from "@/lib/voice/speech";

const ONBOARDING_KEY = "aitherapist_onboarded";

/**
 * First-time voice picker modal.
 *
 * Shows once after first login if the user hasn't set a voice preference.
 * Sets a flag so it won't appear again, even if user picks "Skip".
 */
export default function FirstTimeVoiceModal() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show if:
    // 1. Browser supports TTS
    // 2. User hasn't set a voice preference yet
    // 3. User hasn't already gone through onboarding (skipped or saved)
    if (!isTTSSupported()) return;

    const alreadyOnboarded = localStorage.getItem(ONBOARDING_KEY) === "true";
    const hasPreference = hasUserSetVoicePreference();

    if (!alreadyOnboarded && !hasPreference) {
      setShouldShow(true);
    }
  }, []);

  function handleSave(voiceName: string) {
    setStoredVoiceName(voiceName);
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShouldShow(false);
  }

  function handleSkip() {
    // User skipped — don't set a voice, but mark them as onboarded
    // so we don't pester them. They can change voice in /settings later.
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShouldShow(false);
  }

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl">
        <VoicePicker
          title="Welcome to AiTherapist"
          description="Before you start, pick the voice you'd like to hear during therapy sessions. You can change this anytime from settings."
          saveLabel="Save and continue"
          skipLabel="Skip for now"
          onSave={handleSave}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}