import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mb-8 text-gray-600">Choose a mode to start a session.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <ModeCard
          title="Patient Agent"
          description="Practice diagnosis. Chat with an AI patient and identify their condition."
          href="/patient-agent"
          color="blue"
        />
        <ModeCard
          title="Therapist Agent"
          description="Validate the model. Role-play as a patient and test the AI therapist's responses."
          href="/therapist-agent"
          color="green"
        />
        <ModeCard
          title="Simulation"
          description="Watch two AI agents converse automatically. Review the transcript and analysis."
          href="/simulation"
          color="purple"
          status="Coming soon"
        />
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Link href="/history" className="text-sm text-blue-600 hover:underline">
          View past sessions →
        </Link>
        <Link
          href="/test-chat"
          className="text-sm text-orange-600 hover:underline"
        >
          🧪 Test Chat (dev only) →
        </Link>
      </div>

    </div>
  );
}

function ModeCard({
  title,
  description,
  href,
  color,
  status,
}: {
  title: string;
  description: string;
  href: string;
  color: "blue" | "green" | "purple";
  status?: string;
}) {
  const colors = {
    blue: "border-blue-200 hover:border-blue-400",
    green: "border-green-200 hover:border-green-400",
    purple: "border-purple-200 hover:border-purple-400",
  };

  const isComingSoon = !!status;

  const content = (
    <div
      className={`rounded-lg border-2 bg-white p-6 transition-colors ${colors[color]} ${
        isComingSoon ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mb-4 text-sm text-gray-600">{description}</p>
      {status && (
        <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
          {status}
        </span>
      )}
    </div>
  );

  // If "coming soon", render as a div. Otherwise, render as a Link.
  if (isComingSoon) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}