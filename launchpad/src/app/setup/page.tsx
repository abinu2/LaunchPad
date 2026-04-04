"use client";

export default function SetupPage() {
  const steps = [
    {
      number: "1",
      title: "Firebase project",
      time: "5 min",
      color: "bg-orange-500",
      items: [
        { label: "Go to", link: "https://console.firebase.google.com", linkText: "console.firebase.google.com" },
        { label: "Create a new project (or use existing)" },
        { label: "Authentication → Sign-in method → enable Email/Password + Google" },
        { label: "Firestore Database → Create database → Start in test mode" },
        { label: "Storage → Get started → Start in test mode" },
        { label: "Project Settings → Your apps → Add web app → copy config into NEXT_PUBLIC_FIREBASE_* vars" },
        { label: "Project Settings → Service accounts → Generate new private key → copy project_id, client_email, private_key into FIREBASE_ADMIN_* vars" },
      ],
    },
    {
      number: "2",
      title: "Google Cloud / Vertex AI",
      time: "5 min",
      color: "bg-blue-500",
      items: [
        { label: "Go to", link: "https://console.cloud.google.com", linkText: "console.cloud.google.com" },
        { label: "Select the same project as Firebase" },
        { label: "APIs & Services → Enable APIs → search 'Vertex AI API' → Enable" },
        { label: "IAM & Admin → Service Accounts → create or use existing → Keys → Add Key → JSON → download" },
        { label: "Save the JSON file as service-account.json in the launchpad/ folder" },
        { label: "Set GOOGLE_CLOUD_PROJECT_ID to your project ID" },
        { label: "Set GOOGLE_APPLICATION_CREDENTIALS=./service-account.json" },
      ],
    },
    {
      number: "3",
      title: "Plaid sandbox (free)",
      time: "2 min",
      color: "bg-green-500",
      items: [
        { label: "Go to", link: "https://dashboard.plaid.com", linkText: "dashboard.plaid.com" },
        { label: "Sign up for a free account" },
        { label: "Team Settings → Keys → copy Client ID and Sandbox Secret" },
        { label: "Set PLAID_ENV=sandbox (already set)" },
        { label: "In the app, use username: user_good / password: pass_good to connect a test bank" },
      ],
    },
    {
      number: "4",
      title: "Stripe (optional)",
      time: "2 min",
      color: "bg-purple-500",
      items: [
        { label: "Go to", link: "https://dashboard.stripe.com", linkText: "dashboard.stripe.com" },
        { label: "Developers → API keys → copy test keys" },
        { label: "App works without Stripe — only needed for payment links" },
      ],
    },
  ];

  const envVars = [
    { key: "NEXT_PUBLIC_FIREBASE_API_KEY", source: "Firebase → Project Settings → Web app config" },
    { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", source: "Firebase → Project Settings → Web app config" },
    { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", source: "Firebase → Project Settings → Web app config" },
    { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", source: "Firebase → Project Settings → Web app config" },
    { key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", source: "Firebase → Project Settings → Web app config" },
    { key: "NEXT_PUBLIC_FIREBASE_APP_ID", source: "Firebase → Project Settings → Web app config" },
    { key: "FIREBASE_ADMIN_PROJECT_ID", source: "Firebase → Service accounts → JSON → project_id" },
    { key: "FIREBASE_ADMIN_CLIENT_EMAIL", source: "Firebase → Service accounts → JSON → client_email" },
    { key: "FIREBASE_ADMIN_PRIVATE_KEY", source: "Firebase → Service accounts → JSON → private_key" },
    { key: "GOOGLE_CLOUD_PROJECT_ID", source: "Google Cloud → project ID (same as Firebase)" },
    { key: "GOOGLE_APPLICATION_CREDENTIALS", source: "Path to service-account.json (e.g. ./service-account.json)" },
    { key: "PLAID_CLIENT_ID", source: "Plaid Dashboard → Team Settings → Keys" },
    { key: "PLAID_SECRET", source: "Plaid Dashboard → Team Settings → Sandbox secret" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Launchpad Setup</h1>
          <p className="text-slate-500 mt-2">Fill in your .env.local file to launch the app. Takes about 12 minutes total.</p>
        </div>

        {/* .env.local location */}
        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">Edit this file:</p>
          <p className="text-green-400 font-mono text-sm">launchpad/.env.local</p>
        </div>

        {/* Steps */}
        {steps.map((step) => (
          <div key={step.number} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm text-slate-700">
                  <span className="text-slate-300 flex-shrink-0 mt-0.5">→</span>
                  <span>
                    {item.label}{" "}
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium">
                        {item.linkText}
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Env var reference */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">All required env vars</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {envVars.map((v) => (
              <div key={v.key} className="px-5 py-3">
                <p className="font-mono text-xs text-blue-700 font-medium">{v.key}</p>
                <p className="text-xs text-slate-500 mt-0.5">{v.source}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FIREBASE_ADMIN_PRIVATE_KEY note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">FIREBASE_ADMIN_PRIVATE_KEY format</p>
          <p className="text-xs text-amber-700 mb-2">
            The private key from the JSON file contains literal newlines. In .env.local, wrap it in double quotes and replace newlines with \n:
          </p>
          <pre className="text-xs bg-amber-100 rounded-lg p-3 text-amber-900 overflow-x-auto whitespace-pre-wrap">
{`FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkq...\\n-----END PRIVATE KEY-----\\n"`}
          </pre>
        </div>

        {/* Launch command */}
        <div className="bg-slate-900 rounded-xl p-5">
          <p className="text-slate-400 text-xs mb-3">Once .env.local is filled in, run:</p>
          <pre className="text-green-400 font-mono text-sm">npm run dev</pre>
          <p className="text-slate-500 text-xs mt-3">App will be at http://localhost:3000</p>
        </div>

      </div>
    </div>
  );
}
