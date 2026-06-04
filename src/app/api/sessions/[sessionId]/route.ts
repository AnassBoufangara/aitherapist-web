import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sessions/[sessionId]
 * Returns the session record (verifying user ownership).
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

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return new Response("Session not found", { status: 404 });
  }

  if (session.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({ session });
}