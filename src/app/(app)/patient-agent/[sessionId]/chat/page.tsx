"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import Chat from "@/components/Chat";

export default function PatientAgentChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/prompt`);
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const data = await res.json();
        setSystemPrompt(data.systemPrompt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  function handleEndSession() {
    if (
      !confirm(
        "End this session and submit your diagnosis? You won't be able to continue the conversation after this.",
      )
    )
      return;
    router.push(`/patient-agent/${sessionId}/results`);
  }

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading session...</div>
    );
  }

  if (error || !systemPrompt) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          Error: {error || "Could not load session"}
        </div>
        <Link
          href="/patient-agent"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to setup
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patient Session</h1>
        <div className="text-xs text-gray-500">
          You are the therapist. Conduct the session, then submit your diagnosis.
        </div>
      </div>

      <Chat
        sessionId={sessionId}
        systemPrompt={systemPrompt}
        onEndSession={handleEndSession}
        placeholder="Ask the patient a question..."
      />
    </div>
  );
}