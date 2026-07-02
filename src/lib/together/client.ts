import Together from "together-ai";

/**
 * Singleton Together AI client.
 * Uses TOGETHER_API_KEY from environment variables.
 */
let cachedClient: Together | null = null;

export function getTogetherClient(): Together {
  if (!cachedClient) {
    if (!process.env.TOGETHER_API_KEY) {
      throw new Error(
        "TOGETHER_API_KEY is not set in environment variables.",
      );
    }
    cachedClient = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    });
  }
  return cachedClient;
}

/**
 * The fine-tuned model identifier.
 * Falls back to env var, with hardcoded default as safety.
 */
export const MODEL_NAME =
  process.env.TOGETHER_MODEL_NAME ||
  "anasboufangara_c9c3/Qwen2.5-7B-Instruct-aitherapist-v1-09464e61";