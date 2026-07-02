/**
 * Analyzer module: runs post-session clinical analysis on a transcript.
 *
 * Uses the fine-tuned model with the classification prompt to detect
 * the most likely condition and provide clinical reasoning.
 */

import { getTogetherClient, MODEL_NAME } from "./client";
import { getAnalyzerClassificationPrompt } from "./prompts";
import type { ChatMessage } from "@/types";

export interface AnalysisResult {
  primaryCondition: string;
  confidence: "high" | "medium" | "low" | "unknown";
  keySymptoms: string;
  clinicalReasoning: string;
  differentialConsiderations: string;
  rawOutput: string; // keep the raw model output for debugging/display fallback
}

/**
 * Format the transcript into a readable string for the analyzer.
 */
function formatTranscript(
  messages: ChatMessage[],
  patientRole: "user" | "assistant",
): string {
  return messages
    .map((msg) => {
      const speaker = msg.role === patientRole ? "PATIENT" : "THERAPIST";
      return `${speaker}: ${msg.content}`;
    })
    .join("\n\n");
}

/**
 * Parse the structured analyzer output into fields.
 */
function parseAnalysisOutput(raw: string): AnalysisResult {
  const getField = (label: string): string => {
    const regex = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n(?:PRIMARY CONDITION|CONFIDENCE|KEY SYMPTOMS OBSERVED|CLINICAL REASONING|DIFFERENTIAL CONSIDERATIONS):|$)`,
      "i",
    );
    const match = raw.match(regex);
    return match ? match[1].trim() : "";
  };

  const confidenceRaw = getField("CONFIDENCE").toLowerCase();
  let confidence: AnalysisResult["confidence"] = "unknown";
  if (confidenceRaw.includes("high")) confidence = "high";
  else if (confidenceRaw.includes("medium")) confidence = "medium";
  else if (confidenceRaw.includes("low")) confidence = "low";

  return {
    primaryCondition: getField("PRIMARY CONDITION") || "Unable to determine",
    confidence,
    keySymptoms: getField("KEY SYMPTOMS OBSERVED"),
    clinicalReasoning: getField("CLINICAL REASONING"),
    differentialConsiderations: getField("DIFFERENTIAL CONSIDERATIONS"),
    rawOutput: raw,
  };
}

/**
 * Run the analyzer on a session transcript.
 *
 * NOTE on roles:
 * - patient_agent mode: AI plays patient => patient messages have role "assistant"
 * - therapist_agent mode: human plays patient => patient messages have role "user"
 */
export async function analyzeTranscript(
  messages: ChatMessage[],
  patientRole: "user" | "assistant",
): Promise<AnalysisResult> {
  const transcript = formatTranscript(messages, patientRole);
  const systemPrompt = getAnalyzerClassificationPrompt();

  const client = getTogetherClient();

  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the conversation transcript to analyze:\n\n${transcript}`,
      },
    ],
    stream: false,
    max_tokens: 500,
    temperature: 0.3,
    top_p: 0.9,
  });

  const rawOutput = response.choices[0]?.message?.content || "";
  return parseAnalysisOutput(rawOutput);
}