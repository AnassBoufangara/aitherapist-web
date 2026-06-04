import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTherapistPrompt,
  getPatientPrompt,
} from "@/lib/together/prompts";

/**
 * GET /api/sessions/[sessionId]/prompt
 * Returns the system prompt for the given session, based on its mode
 * and (for patient_agent) its assigned condition.
 */
export async function GET(
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

  // Fetch the session and verify ownership
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, user_id, mode, assigned_condition")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return new Response("Session not found", { status: 404 });
  }

  if (session.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Build the appropriate system prompt
  let systemPrompt: string;
  if (session.mode === "patient_agent") {
    systemPrompt = getPatientPrompt(session.assigned_condition || "other");
  } else if (session.mode === "therapist_agent") {
    systemPrompt = getTherapistPrompt();
  } else {
    return new Response("Unsupported session mode", { status: 400 });
  }

  return Response.json({ systemPrompt });
}