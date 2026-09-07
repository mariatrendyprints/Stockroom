"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiCall } from "@/lib/fetcher";

type Sellable = {
  items: { id: string; name: string; units: { id: string; name: string; qty: number; inStock: boolean }[] }[];
  services: { id: string; name: string; makeable: boolean }[];
};

export default function SellForm({ onSold }: { onSold?: () => void }) {
  const { data, mutate } = useSWR<Sellable>("/api/sellable", fetcher);
  const [mode, setMode] = useState<"product" | "service">("product");
  const [itemId, setItemId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<{ id: string; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const items = data?.items ?? [];
  const services = data?.services ?? [];
  const currentItem = items.find((i) => i.id === (itemId || items[0]?.id));
  const effectiveItemId = currentItem?.id ?? "";
  const effectiveUnitId = currentItem?.units.some((u) => u.id === unitId) ? unitId : currentItem?.units[0]?.id ?? "";
  const effectiveServiceId = serviceId || services[0]?.id || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const n = parseInt(qty, 10);
      if (!n || n < 1) throw new Error("Enter a quantity of at least 1.");

      if (mode === "product") {
        if (!effectiveUnitId) throw new Error("Choose an item.");
        const res = await apiCall("/api/sales/product", "POST", { unitId: effectiveUnitId, qty: n });
        setConfirmations((c) => [{ id: res.sale.id, text: `Sold ${n} × ${res.sale.refName}` }, ...c].slice(0, 5));
      } else {
        if (!effectiveServiceId) throw new Error("Choose a service.");
        const res = await apiCall("/api/sales/service", "POST", { serviceId: effectiveServiceId, qty: n });
        setConfirmations((c) => [{ id: res.sale.id, text: `Logged ${n} × ${res.sale.refName}` }, ...c].slice(0, 5));
      }
      setQty("1");
      mutate();
      onSold?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center gap-1 mb-4 rounded-md border border-border p-1 w-fit">
        {(["product", "service"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-sm px-3 py-1 rounded-md capitalize transition-colors ${
              mode === m ? "bg-accent text-accent-ink" : "text-ink-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "product" ? (
          <>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Item</label>
              <select
                value={effectiveItemId}
                onChange={(e) => {
                  setItemId(e.target.value);
                  setUnitId("");
                }}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
              >
                {items.length === 0 && <option value="">No items available</option>}
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-muted mb-1">Unit</label>
              <select
                value={effectiveUnitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
              >
                {currentItem?.units.map((u) => (
                  <option key={u.id} value={u.id} disabled={!u.inStock}>
                    {u.name} {u.inStock ? `(${u.qty} in stock)` : "(out of stock)"}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs text-ink-muted mb-1">Service</label>
            <select
              value={effectiveServiceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
            >
              {services.length === 0 && <option value="">No services available</option>}
              {services.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.makeable}>
                  {s.name} {s.makeable ? "" : "(out of materials)"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-ink-muted mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-md bg-accent text-accent-ink py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Logging…" : mode === "product" ? "Log sale" : "Log service"}
        </button>
      </form>

      {confirmations.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3">
          {confirmations.map((c) => (
            <li key={c.id} className="text-xs text-accent">
              ✓ {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
