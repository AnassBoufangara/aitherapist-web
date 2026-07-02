"use client";

import { useState } from "react";

interface AnalysisResult {
  primaryCondition: string;
  confidence: "high" | "medium" | "low" | "unknown";
  keySymptoms: string;
  clinicalReasoning: string;
  differentialConsiderations: string;
  rawOutput?: string;
}

interface AnalysisPanelProps {
  sessionId: string;
  /** Pre-loaded analysis if it already exists in the DB */
  existingAnalysis?: AnalysisResult | null;
}

export default function AnalysisPanel({
  sessionId,
  existingAnalysis,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(
    existingAnalysis || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  // Not yet analyzed — show the run button
  if (!analysis) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Clinical Analysis
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Run the AI analyzer to assess the conversation and detect the most
          likely condition based on the symptoms expressed.
        </p>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Analyzing... (this may take a moment)" : "Run analysis"}
        </button>
        {loading && (
          <p className="mt-2 text-xs text-gray-500">
            The endpoint may need to spin up if it was idle. Please wait.
          </p>
        )}
      </div>
    );
  }

  // Analyzed — show the results
  const confidenceColor = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-orange-100 text-orange-800",
    unknown: "bg-gray-100 text-gray-800",
  }[analysis.confidence];

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Clinical Analysis
        </h3>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${confidenceColor}`}
        >
          {analysis.confidence} confidence
        </span>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Detected Condition
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {analysis.primaryCondition}
          </div>
        </div>

        {analysis.keySymptoms && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Key Symptoms Observed
            </div>
            <div className="text-gray-700">{analysis.keySymptoms}</div>
          </div>
        )}

        {analysis.clinicalReasoning && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Clinical Reasoning
            </div>
            <div className="text-gray-700">{analysis.clinicalReasoning}</div>
          </div>
        )}

        {analysis.differentialConsiderations && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              Differential Considerations
            </div>
            <div className="text-gray-700">
              {analysis.differentialConsiderations}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 border-t pt-3 text-xs text-gray-400">
        AI-generated analysis for educational purposes. The analyzer was trained
        on limited clinical tasks — treat its output as a learning aid, not a
        clinical diagnosis.
      </p>
    </div>
  );
}