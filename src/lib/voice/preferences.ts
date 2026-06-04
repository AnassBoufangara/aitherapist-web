/**
 * Voice preference persistence using browser localStorage.
 *
 * Stores the user's chosen voice name (e.g., "Google US English").
 * Read on app mount, written when user picks/changes voice.
 *
 * Note: localStorage is per-device. Switching devices = pick again.
 * Can be migrated to Supabase user_settings table in v2 if needed.
 */

const STORAGE_KEY = "aitherapist_voice";

/**
 * Get the user's saved voice name, or null if not set yet.
 */
export function getStoredVoiceName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private mode / iframes
    return null;
  }
}

/**
 * Save the user's voice preference.
 */
export function setStoredVoiceName(voiceName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, voiceName);
  } catch {
    // ignore — quota exceeded or private mode
  }
}

/**
 * Clear the saved voice preference (e.g., user resets settings).
 */
export function clearStoredVoiceName(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Resolve the stored voice NAME into an actual SpeechSynthesisVoice object.
 * Returns null if no preference saved OR the saved voice isn't available
 * on this device (e.g., user switched OS).
 */
export function resolveStoredVoice(
  availableVoices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const savedName = getStoredVoiceName();
  if (!savedName) return null;
  return availableVoices.find((v) => v.name === savedName) || null;
}

/**
 * Pick a sensible default voice when user has no preference saved.
 * Returns the best-sounding available voice.
 */
export function pickDefaultVoice(
  availableVoices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (availableVoices.length === 0) return null;
  return (
    availableVoices.find((v) => v.name.toLowerCase().includes("google")) ||
    availableVoices.find((v) => v.name.toLowerCase().includes("natural")) ||
    availableVoices.find((v) => v.name.toLowerCase().includes("samantha")) ||
    availableVoices.find((v) => v.name.toLowerCase().includes("aria")) ||
    availableVoices[0]
  );
}

/**
 * Returns true if the user has explicitly set a voice preference
 * (vs. just using the auto-picked default).
 */
export function hasUserSetVoicePreference(): boolean {
  return getStoredVoiceName() !== null;
}