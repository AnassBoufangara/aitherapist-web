import { createClient } from "@/lib/supabase/server";
import {
  CONDITION_CONFIG_MAP,
  getAvailableConditions,
} from "@/lib/together/prompts";

/**
 * GET /api/conditions
 * Returns available conditions for the Patient Agent manual selection.
 *
 * Returns: { conditions: Array<{ key: string; label: string }> }
 */
export async function GET() {
  // Require auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Build human-readable labels from the condition map
  const keys = getAvailableConditions();
  const conditions = keys.map((key) => ({
    key,
    label: formatLabel(key, CONDITION_CONFIG_MAP[key]?.phrase || key),
  }));

  // Sort alphabetically by label for predictable UI
  conditions.sort((a, b) => a.label.localeCompare(b.label));

  return Response.json({ conditions });
}

function formatLabel(key: string, phrase: string): string {
  // Capitalize first letter of phrase for display
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
