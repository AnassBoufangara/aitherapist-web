import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTherapistPrompt, getPatientPrompt } from "@/lib/together/prompts";

/**
 * POST /api/test-prompt
 * Returns a system prompt for the given mode + condition.
 * Used by test-chat page for development. Will be replaced
 * by proper mode endpoints later.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { mode, condition } = await request.json();

  let systemPrompt: string;

  if (mode === "patient_agent") {
    systemPrompt = getPatientPrompt(condition || "depression");
  } else if (mode === "therapist_agent") {
    systemPrompt = getTherapistPrompt();
  } else {
    return new Response("Invalid mode", { status: 400 });
  }

  return Response.json({ systemPrompt });
}