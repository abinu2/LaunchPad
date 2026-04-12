"use client";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const steps = [
    {
      number: "1",
      title: "Auth0",
      time: "5 min",
      color: "bg-orange-500",
      items: [
        { label: "Go to", link: "https://manage.auth0.com", linkText: "manage.auth0.com" },
        { label: "Create an application or use an existing Regular Web App" },
        { label: "Set Allowed Callback URLs to http://localhost:3000/auth/callback" },
        { label: "Set Allowed Logout URLs to http://localhost:3000" },
        { label: "Copy Domain, Client ID, Client Secret, and generate an AUTH0_SECRET" },
      ],
    },
    {
      number: "2",
      title: "Postgres + Prisma",
      time: "5 min",
      color: "bg-blue-500",
      items: [
        { label: "Create or use a PostgreSQL database" },
        { label: "Set DATABASE_URL to your Postgres connection string" },
        { label: "Run pnpm prisma generate" },
        { label: "Run pnpm prisma db push (or migrations) to apply the schema" },
      ],
    },
    {
      number: "3",
      title: "AI (OpenRouter)",
      time: "2 min",
      color: "bg-green-500",
      items: [
        { label: "Go to", link: "https://openrouter.ai/keys", linkText: "openrouter.ai/keys" },
        { label: "Create an API key and set OPENROUTER_API_KEY — gives access to Gemini 2.0 Flash and 200+ models" },
        { label: "Optional fallback: set GROQ_API_KEY from", link: "https://console.groq.com", linkText: "console.groq.com" },
        { label: "Optional: override AI_MODEL or AI_VISION_MODEL for a different model tier" },
      ],
    },
    {
      number: "4",
      title: "Plaid / Stripe",
      time: "3 min",
      color: "bg-purple-500",
      items: [
        { label: "Create a Plaid sandbox app and copy PLAID_CLIENT_ID / PLAID_SECRET" },
        { label: "Stripe is optional unless you want hosted payment links" },
      ],
    },
    {
      number: "5",
      title: "Vercel Blob",
      time: "2 min",
      color: "bg-white/10",
      items: [
        { label: "Create a Vercel Blob store for uploads" },
        { label: "Set BLOB_READ_WRITE_TOKEN in local env and in Vercel" },
      ],
    },
  ];

  const envVars = [
    { key: "AUTH0_DOMAIN", source: "Auth0 application settings" },
    { key: "AUTH0_CLIENT_ID", source: "Auth0 application settings" },
    { key: "AUTH0_CLIENT_SECRET", source: "Auth0 application settings" },
    { key: "AUTH0_SECRET", source: "Generate a long random hex string" },
    { key: "AUTH0_BASE_URL", source: "Usually http://localhost:3000 in local dev" },
    { key: "DATABASE_URL", source: "PostgreSQL connection string for Prisma" },
    { key: "OPENROUTER_API_KEY", source: "OpenRouter API key — primary AI provider (Gemini 2.0 Flash)" },
    { key: "GROQ_API_KEY", source: "Groq API key — fallback if OPENROUTER_API_KEY is not set" },
    { key: "PLAID_CLIENT_ID", source: "Plaid dashboard" },
    { key: "PLAID_SECRET", source: "Plaid dashboard" },
    { key: "STRIPE_SECRET_KEY", source: "Stripe dashboard (optional)" },
    { key: "NEXT_PUBLIC_APP_URL", source: "Usually http://localhost:3000 in local dev" },
    { key: "STRIPE_WEBHOOK_SECRET", source: "Stripe webhook settings (optional)" },
    { key: "BLOB_READ_WRITE_TOKEN", source: "Vercel Blob store token" },
  ];

  return (
    <div className="min-h-screen bg-white/5 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#00CF31] rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Launchpad Setup</h1>
          <p className="text-white/50 mt-2">Fill in `launchpad/.env.local` for the Prisma + Auth0 stack.</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-xs text-white/40 mb-2">Edit this file:</p>
          <p className="text-green-400 font-mono text-sm">launchpad/.env.local</p>
        </div>

        {steps.map((step) => (
          <div key={step.number} className="glass-card overflow-hidden">
            <div className={`${step.color} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {step.number}
                </span>
                <h2 className="font-semibold text-white">{step.title}</h2>
              </div>
              <span className="text-white/70 text-xs">{step.time}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {step.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm text-white/70">
                  <span className="text-white/30 flex-shrink-0 mt-0.5">-&gt;</span>
                  <span>
                    {item.label}{" "}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#00CF31] hover:underline font-medium">
                        {item.linkText}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <h2 className="font-semibold text-white">Required env vars</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {envVars.map((v) => (
              <div key={v.key} className="px-5 py-3">
                <p className="font-mono text-xs text-blue-400 font-medium">{v.key}</p>
                <p className="text-xs text-white/50 mt-0.5">{v.source}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-5">
          <p className="text-white/40 text-xs mb-3">Once `.env.local` is filled in, run:</p>
          <pre className="text-green-400 font-mono text-sm">{`pnpm prisma generate
pnpm prisma db push
pnpm dev`}</pre>
          <p className="text-white/50 text-xs mt-3">App will be at http://localhost:3000</p>
        </div>
      </div>
    </div>
  );
}
