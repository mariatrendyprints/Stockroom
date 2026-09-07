"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiCall } from "@/lib/fetcher";
import { formatPeso } from "@/lib/money";
import EditableCell from "@/components/EditableCell";
import ConfirmButton from "@/components/ConfirmButton";
import Field from "@/components/Field";

type Unit = {
  id: string;
  name: string;
  qty: number;
  costPrice: number;
  salesPrice: number;
  factor: number;
};
type Item = {
  id: string;
  name: string;
  reorder: number;
  units: Unit[];
  baseEquivalent: number;
  status: "OK" | "Low" | "Out";
  value: number;
};

function StatusPill({ status }: { status: Item["status"] }) {
  const classes =
    status === "OK"
      ? "bg-accent-soft text-accent"
      : status === "Low"
        ? "bg-amber-soft text-amber"
        : "bg-red-soft text-red";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>{status}</span>;
}

export default function ItemsPanel() {
  const { data, error, mutate } = useSWR<{ items: Item[] }>("/api/items", fetcher);
  const [addingItem, setAddingItem] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      mutate();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (error) return <p className="text-sm text-red">Failed to load inventory.</p>;
  if (!data) return <p className="text-sm text-ink-muted">Loading inventory…</p>;

  return (
    <section className="rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Inventory</h2>
        <button
          onClick={() => setAddingItem((v) => !v)}
          className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5"
        >
          {addingItem ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {actionError && <p className="text-sm text-red px-4 pt-3">{actionError}</p>}

      {addingItem && (
        <AddItemForm
          onDone={() => {
            setAddingItem(false);
            mutate();
          }}
        />
      )}

      <div className="divide-y divide-border">
        {data.items.length === 0 && <p className="text-sm text-ink-muted px-4 py-6">No items yet.</p>}
        {data.items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
              >
                <span className="font-medium">{item.name}</span>
                <StatusPill status={item.status} />
                <span className="text-xs text-ink-faint font-mono">
                  {item.baseEquivalent.toFixed(3)} base units
                </span>
              </button>
              <span className="text-sm font-mono text-ink-muted">{formatPeso(item.value)}</span>
              <ConfirmButton onConfirm={() => run(() => apiCall(`/api/items/${item.id}`, "DELETE"))} />
            </div>

            {expanded[item.id] && (
              <div className="mt-3 pl-1">
                <div className="flex items-center gap-2 text-xs text-ink-muted mb-2">
                  <span>Reorder at</span>
                  <EditableCell
                    value={item.reorder}
                    onCommit={(n) => run(() => apiCall(`/api/items/${item.id}`, "PATCH", { reorder: n }))}
                  />
                  <span>(largest unit)</span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted">
                      <th className="font-normal pb-1">Unit</th>
                      <th className="font-normal pb-1">Qty</th>
                      <th className="font-normal pb-1">Cost</th>
                      <th className="font-normal pb-1">Sale</th>
                      <th className="font-normal pb-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.units.map((u) => (
                      <tr key={u.id} className="border-t border-border">
                        <td className="py-1.5">{u.name}</td>
                        <td className="py-1.5 w-24">
                          <EditableCell
                            value={u.qty}
                            onCommit={(n) => run(() => apiCall(`/api/units/${u.id}`, "PATCH", { qty: n }))}
                          />
                        </td>
                        <td className="py-1.5 w-24">
                          <EditableCell
                            value={u.costPrice}
                            format={(n) => formatPeso(n)}
                            onCommit={(n) => run(() => apiCall(`/api/units/${u.id}`, "PATCH", { costPrice: n }))}
                          />
                        </td>
                        <td className="py-1.5 w-24">
                          <EditableCell
                            value={u.salesPrice}
                            format={(n) => formatPeso(n)}
                            onCommit={(n) => run(() => apiCall(`/api/units/${u.id}`, "PATCH", { salesPrice: n }))}
                          />
                        </td>
                        <td className="py-1.5 text-right">
                          <ConfirmButton
                            onConfirm={() => run(() => apiCall(`/api/units/${u.id}`, "DELETE"))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ItemActions item={item} onDone={() => mutate()} onError={setActionError} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AddItemForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [reorder, setReorder] = useState("0");
  const [qty, setQty] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [salesPrice, setSalesPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiCall("/api/items", "POST", {
        name,
        unitName,
        reorder: parseFloat(reorder) || 0,
        qty: parseFloat(qty) || 0,
        costPrice: parseFloat(costPrice) || 0,
        salesPrice: parseFloat(salesPrice) || 0,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-4 py-3 border-b border-border bg-bg/40">
      <p className="text-xs text-ink-muted mb-2">
        Start with your largest unit (e.g. &quot;Ream&quot; before &quot;Piece&quot;) — you can add smaller units
        under it afterward.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Field label="Item name" className="col-span-2 sm:col-span-1">
          <input
            required
            placeholder="e.g. A4 Bond Paper"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Largest unit">
          <input
            required
            placeholder="e.g. Ream"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Reorder at">
          <input
            type="number"
            step="0.001"
            value={reorder}
            onChange={(e) => setReorder(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Starting qty">
          <input
            type="number"
            step="0.001"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Cost price">
          <input
            type="number"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="Sale price">
          <input
            type="number"
            step="0.01"
            value={salesPrice}
            onChange={(e) => setSalesPrice(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
        </Field>
      </div>
      {error && <p className="text-sm text-red mt-2">{error}</p>}
      <button
        disabled={busy}
        className="mt-2 text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Add item"}
      </button>
    </form>
  );
}

function ItemActions({
  item,
  onDone,
  onError,
}: {
  item: Item;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [mode, setMode] = useState<"none" | "unit" | "convert">("none");

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => setMode(mode === "unit" ? "none" : "unit")}
        className="text-xs rounded-md border border-border px-2 py-1 text-ink-muted hover:text-ink"
      >
        + Add unit
      </button>
      {item.units.length >= 2 && (
        <button
          onClick={() => setMode(mode === "convert" ? "none" : "convert")}
          className="text-xs rounded-md border border-border px-2 py-1 text-ink-muted hover:text-ink"
        >
          Convert stock
        </button>
      )}

      {mode === "unit" && (
        <AddUnitForm
          item={item}
          onDone={() => {
            setMode("none");
            onDone();
          }}
          onError={onError}
        />
      )}
      {mode === "convert" && (
        <ConvertForm
          item={item}
          onDone={() => {
            setMode("none");
            onDone();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function AddUnitForm({
  item,
  onDone,
  onError,
}: {
  item: Item;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [referenceUnitId, setReferenceUnitId] = useState(item.units[0]?.id ?? "");
  const [equalsN, setEqualsN] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [salesPrice, setSalesPrice] = useState("0");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await apiCall(`/api/items/${item.id}/units`, "POST", {
        name,
        referenceUnitId,
        equalsN: parseFloat(equalsN),
        costPrice: parseFloat(costPrice) || 0,
        salesPrice: parseFloat(salesPrice) || 0,
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const refUnit = item.units.find((u) => u.id === referenceUnitId);

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 mt-2 w-full">
      <Field label="New unit name">
        <input
          required
          placeholder="e.g. Piece"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-36 rounded-md border border-border bg-surface px-2 py-1 text-sm"
        />
      </Field>
      <Field label="Reference unit">
        <select
          value={referenceUnitId}
          onChange={(e) => setReferenceUnitId(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
        >
          {item.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Equals">
        <input
          required
          type="number"
          step="any"
          placeholder="N"
          value={equalsN}
          onChange={(e) => setEqualsN(e.target.value)}
          className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm"
        />
      </Field>
      <Field label="Cost price">
        <input
          type="number"
          step="0.01"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm"
        />
      </Field>
      <Field label="Sale price">
        <input
          type="number"
          step="0.01"
          value={salesPrice}
          onChange={(e) => setSalesPrice(e.target.value)}
          className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm"
        />
      </Field>
      <button disabled={busy} className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5 disabled:opacity-60">
        {busy ? "Adding…" : "Add"}
      </button>
      <span className="text-xs text-ink-faint w-full">
        1 {refUnit?.name ?? "reference unit"} = {equalsN || "N"} {name || "new unit"}
      </span>
    </form>
  );
}

function ConvertForm({
  item,
  onDone,
  onError,
}: {
  item: Item;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [fromUnitId, setFromUnitId] = useState(item.units[0]?.id ?? "");
  const [toUnitId, setToUnitId] = useState(item.units[1]?.id ?? "");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    try {
      await apiCall(`/api/items/${item.id}/convert`, "POST", {
        fromUnitId,
        toUnitId,
        qty: parseFloat(qty),
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 mt-2 w-full">
      <input
        required
        type="number"
        step="any"
        placeholder="Qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-sm"
      />
      <span className="text-xs text-ink-muted">of</span>
      <select
        value={fromUnitId}
        onChange={(e) => setFromUnitId(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      >
        {item.units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-ink-muted">into</span>
      <select
        value={toUnitId}
        onChange={(e) => setToUnitId(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
      >
        {item.units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <button disabled={busy} className="text-xs rounded-md bg-accent text-accent-ink px-3 py-1.5 disabled:opacity-60">
        {busy ? "Converting…" : "Convert"}
      </button>
    </form>
  );
}
