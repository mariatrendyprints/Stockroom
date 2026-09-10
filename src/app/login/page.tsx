"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "demo-admin@stockroom.local", password: "demo1234" },
  { label: "Staff", email: "demo-staff@stockroom.local", password: "demo1234" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold mb-1">Stockroom</h1>
        <p className="text-sm text-ink-muted mb-6">Sign in to continue</p>

        <label className="block text-sm mb-1 text-ink-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <label className="block text-sm mb-1 text-ink-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-sm text-red mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent text-accent-ink py-2 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {DEMO_MODE && (
          <div className="mt-6 rounded-md border border-amber-soft bg-amber-soft/50 p-3 text-xs text-ink-muted">
            <p className="font-medium text-amber mb-1.5">Demo environment</p>
            <p className="mb-2">Sample data — feel free to change anything. Nothing here is real.</p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <div key={a.email} className="flex items-center justify-between gap-2">
                  <span className="font-mono">
                    {a.label}: {a.email} / {a.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(a.password);
                    }}
                    className="shrink-0 rounded border border-border px-1.5 py-0.5 hover:text-ink"
                  >
                    Fill
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
