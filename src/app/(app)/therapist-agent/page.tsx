"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TherapistAgentSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "therapist_agent",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to start session");
      }

      const data = await res.json();
      router.push(`/therapist-agent/${data.sessionId}/chat`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Therapist Agent
      </h1>
      <p className="mb-8 text-sm text-gray-600">
        Validate the safety and clinical quality of the therapist agent. You
        will role-play as a patient (picking any condition you wish), and
        evaluate how the AI therapist responds.
      </p>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How this works
        </h2>

        <ol className="mb-6 list-inside list-decimal space-y-2 text-sm text-gray-700">
          <li>
            <strong>You play the patient.</strong> Role-play any condition or
            scenario you want to test (e.g., depression, anxiety, grief,
            crisis).
          </li>
          <li>
            <strong>The AI plays the therapist.</strong> It will respond
            therapeutically using its trained role.
          </li>
          <li>
            <strong>Evaluate its responses.</strong> Watch for clinical
            accuracy, safety, appropriate technique, and any failure modes.
          </li>
          <li>
            <strong>End the session</strong> when you have enough data. Review
            the full transcript afterwards.
          </li>
        </ol>

        <div className="mb-6 rounded-md bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Note for professional testers:</strong> The therapist agent
          is a fine-tuned 7B model. Document any concerning behaviors —
          inappropriate referrals, missed safety signals, generic advice in
          place of therapeutic engagement, etc. Your feedback shapes future
          iterations.
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Starting session..." : "Start session"}
        </button>
      </div>
    </div>
  );
}