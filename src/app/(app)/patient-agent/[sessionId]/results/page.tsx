"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { DbMessage } from "@/types";

interface ConditionOption {
  key: string;
  label: string;
}

interface SessionInfo {
  id: string;
  mode: string;
  assigned_condition: string | null;
  student_diagnosis: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export default function PatientAgentResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [conditions, setConditions] = useState<ConditionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Diagnosis submission form
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load session + messages + conditions list
  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, messagesRes, conditionsRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/messages`),
          fetch(`/api/conditions`),
        ]);

        if (!sessionRes.ok) throw new Error("Could not load session");
        if (!messagesRes.ok) throw new Error("Could not load messages");
        if (!conditionsRes.ok) throw new Error("Could not load conditions");

        const sessionData = await sessionRes.json();
        const messagesData = await messagesRes.json();
        const conditionsData = await conditionsRes.json();

        setSession(sessionData.session);
        setMessages(messagesData.messages);
        setConditions(conditionsData.conditions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  async function handleSubmitDiagnosis() {
    if (!selectedDiagnosis) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: selectedDiagnosis,
          reasoning: reasoning.trim() || null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500">Loading results...</div>;
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error || "Could not load session"}
        </div>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const hasSubmitted = !!session.student_diagnosis;
  const assignedConditionKey = session.assigned_condition;
  const assignedConditionLabel =
    conditions.find((c) => c.key === assignedConditionKey)?.label ||
    assignedConditionKey;
  const studentDiagnosisLabel =
    conditions.find((c) => c.key === session.student_diagnosis)?.label ||
    session.student_diagnosis;
  const isCorrect = session.student_diagnosis === session.assigned_condition;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        {hasSubmitted ? "Session Results" : "Submit Your Diagnosis"}
      </h1>
      <p className="mb-8 text-sm text-gray-600">
        {hasSubmitted
          ? "Here's how you did. Review the transcript below."
          : "Based on the conversation, what condition do you think the patient was presenting with?"}
      </p>

      {/* Diagnosis submission form (shown until submitted) */}
      {!hasSubmitted && (
        <div className="mb-8 rounded-lg border bg-white p-6">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Your diagnosis
            </label>
            <select
              value={selectedDiagnosis}
              onChange={(e) => setSelectedDiagnosis(e.target.value)}
              suppressHydrationWarning
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Select a condition...</option>
              {conditions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Your reasoning (optional)
            </label>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={4}
              placeholder="What signs or symptoms led you to this diagnosis?"
              suppressHydrationWarning
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmitDiagnosis}
            disabled={!selectedDiagnosis || submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit diagnosis"}
          </button>
        </div>
      )}

      {/* Results (shown after submission) */}
      {hasSubmitted && (
        <div className="mb-8 space-y-4">
          {/* Correct/incorrect banner */}
          <div
            className={`rounded-lg border-2 p-6 ${
              isCorrect
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50"
            }`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-3xl">{isCorrect ? "✓" : "✗"}</span>
              <h2
                className={`text-xl font-semibold ${
                  isCorrect ? "text-green-900" : "text-orange-900"
                }`}
              >
                {isCorrect ? "Correct diagnosis" : "Different diagnosis"}
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Your diagnosis: </span>
                <strong className="text-gray-900">
                  {studentDiagnosisLabel}
                </strong>
              </div>
              <div>
                <span className="text-gray-600">Assigned condition: </span>
                <strong className="text-gray-900">
                  {assignedConditionLabel}
                </strong>
              </div>
            </div>
            {!isCorrect && (
              <p className="mt-4 text-sm text-orange-900">
                Don&apos;t worry — diagnostic interviewing is a skill that
                develops with practice. Review the transcript below and notice
                what symptoms were present.
              </p>
            )}
          </div>

          {/* TODO: Day 7 — analyzer output goes here */}
          <div className="rounded-lg border bg-gray-50 p-4 text-xs text-gray-500">
            💡 Detailed clinical analysis of your therapeutic technique will be
            added soon.
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Session Transcript ({messages.length} messages)
          </h3>
        </div>
        <div className="max-h-[500px] space-y-3 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-gray-400">
              No messages in this session.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action buttons */}
      {hasSubmitted && (
        <div className="mt-6 flex gap-3">
          <Link
            href="/patient-agent"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Start new session
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}