import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sessions/[sessionId]/end
 * Marks the session as ended (sets status='ended' and ended_at).
 * Used by therapist_agent mode where there's no diagnosis form to trigger this.
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

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, user_id, status")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return new Response("Session not found", { status: 404 });
  }

  if (session.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (session.status !== "active") {
    return Response.json({ session });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("sessions")
    .update({
      ended_at: new Date().toISOString(),
      status: "ended",
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (updateErr) {
    return new Response(updateErr.message, { status: 500 });
  }

  return Response.json({ session: updated });
}