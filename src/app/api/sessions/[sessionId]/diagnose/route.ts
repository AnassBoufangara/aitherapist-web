import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sessions/[sessionId]/diagnose
 * Body: { diagnosis: string, reasoning?: string | null }
 *
 * Records the student's diagnosis and marks the session as ended.
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

  const body = await request.json();
  const { diagnosis, reasoning } = body;

  if (!diagnosis || typeof diagnosis !== "string") {
    return new Response("Missing 'diagnosis' field", { status: 400 });
  }

  // Verify session ownership + check it's a patient_agent session
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

  if (session.mode !== "patient_agent") {
    return new Response("Diagnosis only applies to patient_agent mode", {
      status: 400,
    });
  }

  if (session.student_diagnosis) {
    return new Response("Diagnosis already submitted for this session", {
      status: 400,
    });
  }

  // Update the session
  const { data: updated, error: updateErr } = await supabase
    .from("sessions")
    .update({
      student_diagnosis: diagnosis,
      ended_at: new Date().toISOString(),
      status: "ended",
      // Store reasoning in analysis_result for now (proper analyzer fills this out in Day 7)
      analysis_result: reasoning
        ? { student_reasoning: reasoning }
        : null,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (updateErr) {
    return new Response(updateErr.message, { status: 500 });
  }

  return Response.json({ session: updated });
}