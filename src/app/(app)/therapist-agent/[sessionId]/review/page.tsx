"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import type { DbMessage } from "@/types";

export default function TherapistAgentReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endedSession, setEndedSession] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/messages`),
        ]);

        if (!sessionRes.ok) throw new Error("Could not load session");
        if (!messagesRes.ok) throw new Error("Could not load messages");

        const sessionData = await sessionRes.json();
        const messagesData = await messagesRes.json();

        setMessages(messagesData.messages);

        // Mark session as ended if not already
        if (sessionData.session.status === "active") {
          await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" });
        }
        setEndedSession(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  if (loading) {
    return <div className="text-center text-gray-500">Loading review...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
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

      <h1 className="mb-2 text-3xl font-bold text-gray-900">Session Review</h1>
      <p className="mb-8 text-sm text-gray-600">
        Review the full transcript below to evaluate the therapist
        agent&apos;s responses.
      </p>

      {/* Placeholder for analyzer output (Day 7) */}
      <div className="mb-8 rounded-lg border bg-gray-50 p-4 text-xs text-gray-500">
        💡 Detailed clinical analysis of the therapist agent&apos;s technique
        will be added soon.
      </div>

      {/* Transcript */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Session Transcript ({messages.length} messages)
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Blue bubbles = you (the patient). Gray bubbles = the AI therapist.
          </p>
        </div>
        <div className="max-h-[600px] space-y-3 overflow-y-auto p-6">
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
      <div className="mt-6 flex gap-3">
        <Link
          href="/therapist-agent"
          className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
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
    </div>
  );
}