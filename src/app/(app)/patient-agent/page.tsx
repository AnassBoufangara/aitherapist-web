"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ConditionOption {
  key: string;
  label: string;
}

export default function PatientAgentSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [conditions, setConditions] = useState<ConditionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available conditions for the manual picker
  useEffect(() => {
    async function loadConditions() {
      try {
        const res = await fetch("/api/conditions");
        if (!res.ok) throw new Error("Failed to load conditions");
        const data = await res.json();
        setConditions(data.conditions);
      } catch (err) {
        console.error("Could not load conditions:", err);
      }
    }
    loadConditions();
  }, []);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "patient_agent",
          condition: mode === "manual" ? selectedCondition : undefined,
          conditionSelectionMethod: mode,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to start session");
      }

      const data = await res.json();
      router.push(`/patient-agent/${data.sessionId}/chat`);
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

      <h1 className="mb-2 text-3xl font-bold text-gray-900">Patient Agent</h1>
      <p className="mb-8 text-sm text-gray-600">
        Practice your diagnostic skills. Chat with an AI patient and try to
        identify their condition. You&apos;ll submit your diagnosis at the end
        and receive feedback.
      </p>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          How would you like to choose the condition?
        </h2>

        <div className="space-y-3">
          {/* Random option */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
              mode === "random"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="random"
              checked={mode === "random"}
              onChange={() => setMode("random")}
              suppressHydrationWarning
              className="mt-1 cursor-pointer"
            />
            <div>
              <div className="font-medium text-gray-900">
                🎲 Random condition
              </div>
              <div className="text-sm text-gray-600">
                The system picks a condition for you. You won&apos;t know what
                it is until after submitting your diagnosis. Best for realistic
                practice.
              </div>
            </div>
          </label>

          {/* Manual option */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors ${
              mode === "manual"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="manual"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
              suppressHydrationWarning
              className="mt-1 cursor-pointer"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                🎯 Choose a condition
              </div>
              <div className="text-sm text-gray-600">
                Pick a specific condition to practice with. Useful for focused
                learning.
              </div>

              {mode === "manual" && (
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  suppressHydrationWarning
                  className="mt-3 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="">Select a condition...</option>
                  {conditions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading || (mode === "manual" && !selectedCondition)}
          className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Starting session..." : "Start session"}
        </button>
      </div>
    </div>
  );
}