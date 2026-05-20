"use client";

import { useState, useEffect } from "react";
import Chat from "@/components/Chat";

export default function TestChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assignedCondition, setAssignedCondition] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [mode, setMode] = useState<"patient_agent" | "therapist_agent">(
    "patient_agent",
  );

  async function startSession() {
    setError(null);
    setSessionId(null);
    setAssignedCondition(null);
    setSystemPrompt(null);

    try {
      // Create session via API
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          conditionSelectionMethod: "random",
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setAssignedCondition(data.assignedCondition || null);

      // Fetch the system prompt for this session
      const promptRes = await fetch("/api/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          condition: data.assignedCondition,
        }),
      });

      if (!promptRes.ok) {
        throw new Error(await promptRes.text());
      }

      const promptData = await promptRes.json();
      setSystemPrompt(promptData.systemPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        Test Chat (Development)
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Quick page to verify the model integration works end-to-end.
      </p>

      {!sessionId && (
        <div className="space-y-4 rounded-lg border bg-white p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mode
            </label>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "patient_agent" | "therapist_agent")
              }
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="patient_agent">
                Patient Agent (random condition)
              </option>
              <option value="therapist_agent">Therapist Agent</option>
            </select>
          </div>

          <button
            onClick={startSession}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Start Test Session
          </button>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      )}

      {sessionId && systemPrompt && (
        <div>
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <strong>Session ID:</strong> {sessionId}
            {assignedCondition && (
              <>
                <br />
                <strong>Assigned condition:</strong> {assignedCondition}
              </>
            )}
            <br />
            <strong>Mode:</strong> {mode}
          </div>

          <Chat
            sessionId={sessionId}
            systemPrompt={systemPrompt}
            placeholder={
              mode === "patient_agent"
                ? "You are the therapist — ask the patient about their feelings..."
                : "You are the patient — share what you're going through..."
            }
          />
        </div>
      )}
    </div>
  );
}