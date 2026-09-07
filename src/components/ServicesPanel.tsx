"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiCall } from "@/lib/fetcher";
import { formatPeso } from "@/lib/money";
import EditableCell from "@/components/EditableCell";
import ConfirmButton from "@/components/ConfirmButton";
import Field from "@/components/Field";

type Item = { id: string; name: string; units: { id: string; name: string }[] };
type RecipeLine = {
  id: string;
  itemId: string;
  unitId: string;
  qtyPerUnit: number;
  item: { id: string; name: string };
  unit: { id: string; name: string };
};
type Service = { id: string; name: string; price: number; recipeLines: RecipeLine[] };

export default function ServicesPanel() {
  const { data, mutate } = useSWR<{ services: Service[] }>("/api/services", fetcher);
  const { data: itemsData } = useSWR<{ items: Item[] }>("/api/items", fetcher);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const items = itemsData?.items ?? [];

  async function run(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (!data) return <p className="text-sm text-ink-muted">Loading services…</p>;

  return (
    <section className="rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Services</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5"
        >
          {adding ? "Cancel" : "+ Add service"}
        </button>
      </div>

      {actionError && <p className="text-sm text-red px-4 pt-3">{actionError}</p>}

      {adding && (
        <NewServiceForm
          onDone={() => {
            setAdding(false);
            mutate();
          }}
        />
      )}

      <div className="divide-y divide-border">
        {data.services.length === 0 && <p className="text-sm text-ink-muted px-4 py-6">No services yet.</p>}
        {data.services.map((s) => (
          <div key={s.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-ink-faint">
                  {s.recipeLines.length} material{s.recipeLines.length === 1 ? "" : "s"}
                </span>
              </button>
              <span className="font-mono text-sm">{formatPeso(s.price)}</span>
              <ConfirmButton onConfirm={() => run(() => apiCall(`/api/services/${s.id}`, "DELETE"))} />
            </div>

            {expanded[s.id] && (
              <div className="mt-3 pl-1 space-y-2">
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <span>Price</span>
                  <EditableCell
                    value={s.price}
                    format={formatPeso}
                    onCommit={(n) => run(() => apiCall(`/api/services/${s.id}`, "PATCH", { price: n }))}
                  />
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted">
                      <th className="font-normal pb-1">Material</th>
                      <th className="font-normal pb-1">Qty per unit of service</th>
                      <th className="font-normal pb-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.recipeLines.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="py-1.5">
                          {l.item.name} ({l.unit.name})
                        </td>
                        <td className="py-1.5 font-mono">{l.qtyPerUnit}</td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() =>
                              run(() =>
                                apiCall(`/api/services/${s.id}`, "PATCH", {
                                  recipe: s.recipeLines
                                    .filter((x) => x.id !== l.id)
                                    .map((x) => ({ itemId: x.itemId, unitId: x.unitId, qtyPerUnit: x.qtyPerUnit })),
                                })
                              )
                            }
                            className="text-xs text-ink-muted hover:text-red"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <AddRecipeLineForm
                  service={s}
                  items={items}
                  onAdd={(line) =>
                    run(() =>
                      apiCall(`/api/services/${s.id}`, "PATCH", {
                        recipe: [
                          ...s.recipeLines.map((x) => ({
                            itemId: x.itemId,
                            unitId: x.unitId,
                            qtyPerUnit: x.qtyPerUnit,
                          })),
                          line,
                        ],
                      })
                    )
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function NewServiceForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiCall("/api/services", "POST", { name, price: parseFloat(price) || 0, recipe: [] });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-4 py-3 border-b border-border bg-bg/40 flex flex-wrap gap-2 items-end">
      <Field label="Service name">
        <input
          required
          placeholder="e.g. Printing (per page)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="Price">
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
        />
      </Field>
      {error && <p className="text-sm text-red w-full">{error}</p>}
      <button disabled={busy} className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5 disabled:opacity-60">
        {busy ? "Adding…" : "Add service"}
      </button>
      <span className="text-xs text-ink-faint w-full">Add materials it consumes after creating it.</span>
    </form>
  );
}

function AddRecipeLineForm({
  service,
  items,
  onAdd,
}: {
  service: Service;
  items: Item[];
  onAdd: (line: { itemId: string; unitId: string; qtyPerUnit: number }) => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const item = items.find((i) => i.id === itemId);
  const [unitId, setUnitId] = useState(item?.units[0]?.id ?? "");
  const [qtyPerUnit, setQtyPerUnit] = useState("1");

  const currentItem = items.find((i) => i.id === itemId);
  const effectiveUnitId = currentItem?.units.some((u) => u.id === unitId) ? unitId : currentItem?.units[0]?.id ?? "";

  if (items.length === 0) return <p className="text-xs text-ink-faint">Add inventory items first.</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={itemId}
        onChange={(e) => {
          setItemId(e.target.value);
          setUnitId("");
        }}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      >
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <select
        value={effectiveUnitId}
        onChange={(e) => setUnitId(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      >
        {currentItem?.units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-ink-muted">×</span>
      <input
        type="number"
        step="any"
        value={qtyPerUnit}
        onChange={(e) => setQtyPerUnit(e.target.value)}
        className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm"
      />
      <button
        onClick={() => {
          if (!effectiveUnitId || !(parseFloat(qtyPerUnit) > 0)) return;
          onAdd({ itemId, unitId: effectiveUnitId, qtyPerUnit: parseFloat(qtyPerUnit) });
          setQtyPerUnit("1");
        }}
        className="text-xs rounded-md border border-border px-2 py-1 text-ink-muted hover:text-ink"
      >
        + Add material
      </button>
    </div>
  );
}
