import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sessions/[sessionId]/messages
 * Returns all messages for the session, oldest first.
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

  // Verify session ownership first
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session || session.user_id !== user.id) {
    return new Response("Session not found", { status: 404 });
  }

  // Load messages
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json({ messages: messages || [] });
}