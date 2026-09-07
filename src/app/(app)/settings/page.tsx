"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiCall } from "@/lib/fetcher";
import ConfirmButton from "@/components/ConfirmButton";

type User = { id: string; name: string; email: string; role: "staff" | "admin"; createdAt: string };

export default function SettingsPage() {
  const { data: settingsData, mutate: mutateSettings } = useSWR<{ settings: { shopName: string } }>(
    "/api/settings",
    fetcher
  );
  const { data: usersData, mutate: mutateUsers } = useSWR<{ users: User[] }>("/api/users", fetcher);

  const [shopName, setShopName] = useState("");
  const [shopSaved, setShopSaved] = useState(false);

  const currentShopName = shopName || settingsData?.settings.shopName || "";

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="font-semibold mb-3">Shop</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await apiCall("/api/settings", "PATCH", { shopName: currentShopName });
            mutateSettings();
            setShopSaved(true);
            setTimeout(() => setShopSaved(false), 2000);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={currentShopName}
            onChange={(e) => setShopName(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm flex-1"
          />
          <button className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5">Save</button>
          {shopSaved && <span className="text-xs text-accent">Saved</span>}
        </form>
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Accounts</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Staff can log sales only. Admins have full access. No shared PIN — each person signs in with their own
            account.
          </p>
        </div>
        <div className="divide-y divide-border">
          {usersData?.users.map((u) => (
            <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-sm">{u.name}</p>
                <p className="text-xs text-ink-muted">
                  {u.email} · {u.role}
                </p>
              </div>
              <ConfirmButton
                onConfirm={async () => {
                  await apiCall(`/api/users/${u.id}`, "DELETE");
                  mutateUsers();
                }}
              />
            </div>
          ))}
        </div>
        <NewUserForm
          onDone={() => {
            mutateUsers();
          }}
        />
      </section>
    </div>
  );
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiCall("/api/users", "POST", { name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-4 py-3 border-t border-border bg-bg/40 flex flex-wrap gap-2 items-center">
      <input
        required
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <input
        required
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "staff" | "admin")}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
      >
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
      {error && <p className="text-sm text-red w-full">{error}</p>}
      <button disabled={busy} className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5 disabled:opacity-60">
        {busy ? "Adding…" : "+ Add account"}
      </button>
    </form>
  );
}
