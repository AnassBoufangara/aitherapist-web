import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeTranscript } from "@/lib/together/analyzer";
import type { ChatMessage } from "@/types";

/**
 * POST /api/sessions/[sessionId]/analyze
 *
 * Runs the analyzer on the session transcript, detects the most likely
 * condition + reasoning, saves to sessions.analysis_result, and returns it.
 *
 * Idempotent-ish: if analysis already exists, returns the cached result
 * unless ?force=true is passed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch + verify session ownership
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return new Response("Session not found", { status: 404 });
  }
  if (session.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Check for cached analysis (unless force=true)
  const force = request.nextUrl.searchParams.get("force") === "true";
  const existing = session.analysis_result;
  if (
    !force &&
    existing &&
    typeof existing === "object" &&
    "primaryCondition" in existing
  ) {
    return Response.json({ analysis: existing, cached: true });
  }

  // Load the transcript
  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return new Response(msgErr.message, { status: 500 });
  }
  if (!messages || messages.length === 0) {
    return new Response("No messages to analyze", { status: 400 });
  }

  // Determine which role is the patient:
  // - patient_agent mode: AI is patient => role "assistant"
  // - therapist_agent mode: human is patient => role "user"
  const patientRole: "user" | "assistant" =
    session.mode === "patient_agent" ? "assistant" : "user";

  // Filter out any empty messages, cast to ChatMessage
  const chatMessages: ChatMessage[] = messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    }));

  try {
    const analysis = await analyzeTranscript(chatMessages, patientRole);

    // Merge with any existing analysis_result (e.g., student_reasoning from diagnosis)
    const merged = {
      ...(existing && typeof existing === "object" ? existing : {}),
      ...analysis,
    };

    // Save to database
    const { error: updateErr } = await supabase
      .from("sessions")
      .update({
        analysis_result: merged,
        status: "analyzed",
      })
      .eq("id", sessionId);

    if (updateErr) {
      console.error("Failed to save analysis:", updateErr);
      // Still return the analysis even if save failed
      return Response.json({ analysis, cached: false, saveError: true });
    }

    return Response.json({ analysis, cached: false });
  } catch (err) {
    console.error("Analyzer error:", err);
    return new Response(
      err instanceof Error ? err.message : "Analysis failed",
      { status: 500 },
    );
  }
}