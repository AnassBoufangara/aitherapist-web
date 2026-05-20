import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SessionMode, ConditionSelectionMethod } from "@/types";
import { getRandomCondition } from "@/lib/together/prompts";

/**
 * POST /api/sessions
 * Creates a new session.
 *
 * Body: {
 *   mode: SessionMode,
 *   condition?: string,                          // For patient_agent mode
 *   conditionSelectionMethod?: 'random' | 'manual' // For patient_agent mode
 * }
 *
 * Returns: { sessionId: string, assignedCondition?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      mode,
      condition,
      conditionSelectionMethod,
    }: {
      mode: SessionMode;
      condition?: string;
      conditionSelectionMethod?: ConditionSelectionMethod;
    } = body;

    if (!mode) {
      return new Response("Missing 'mode' field", { status: 400 });
    }

    // For patient_agent mode, assign a condition
    let assignedCondition: string | null = null;
    let selectionMethod: ConditionSelectionMethod | null = null;

    if (mode === "patient_agent") {
      if (conditionSelectionMethod === "manual" && condition) {
        assignedCondition = condition;
        selectionMethod = "manual";
      } else {
        // Default to random
        assignedCondition = getRandomCondition();
        selectionMethod = "random";
      }
    }

    // Create the session
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        mode,
        assigned_condition: assignedCondition,
        condition_selection_method: selectionMethod,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Session creation error:", error);
      return new Response(error.message, { status: 500 });
    }

    return Response.json({
      sessionId: session.id,
      assignedCondition,
    });
  } catch (error) {
    console.error("Sessions API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}