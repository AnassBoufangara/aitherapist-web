/**
 * Shared TypeScript types for the AiTherapist platform.
 */

// ============================================
// MODE TYPES
// ============================================
export type SessionMode = "patient_agent" | "therapist_agent" | "simulation";

export type ConditionSelectionMethod = "random" | "manual";

// ============================================
// MESSAGE TYPES
// ============================================
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// ============================================
// SESSION TYPES (matches DB schema)
// ============================================
export interface Session {
  id: string;
  user_id: string;
  mode: SessionMode;
  assigned_condition: string | null;
  condition_selection_method: ConditionSelectionMethod | null;
  student_diagnosis: string | null;
  analysis_result: AnalysisResult | null;
  started_at: string;
  ended_at: string | null;
  status: "active" | "ended" | "analyzed";
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

// ============================================
// ANALYSIS RESULT
// ============================================
export interface AnalysisResult {
  assessment: string;
  reasoning: string;
  confidence: number;
  diagnostic_match?: boolean; // For patient_agent mode (did student guess right?)
}