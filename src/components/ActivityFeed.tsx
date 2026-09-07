"use client";

import useSWR from "swr";
import { fetcher, apiCall } from "@/lib/fetcher";
import { formatPeso } from "@/lib/money";
import ConfirmButton from "@/components/ConfirmButton";

type Sale = {
  id: string;
  type: "product" | "service";
  refName: string;
  qty: number;
  amount: number;
  cost: number;
  at: string;
};

export default function ActivityFeed() {
  const { data, mutate } = useSWR<{ sales: Sale[] }>("/api/sales?limit=25", fetcher);

  if (!data) return <p className="text-sm text-ink-muted">Loading activity…</p>;

  return (
    <div className="rounded-card border border-border bg-surface">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">Recent activity</h2>
      </div>
      <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
        {data.sales.length === 0 && <p className="text-sm text-ink-muted px-4 py-6">No sales yet.</p>}
        {data.sales.map((s) => (
          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm truncate">
                {s.qty} × {s.refName}
              </p>
              <p className="text-xs text-ink-faint">{new Date(s.at).toLocaleString("en-PH")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-sm">{formatPeso(s.amount)}</p>
              <p className="text-xs text-ink-faint font-mono">net {formatPeso(s.amount - s.cost)}</p>
            </div>
            <ConfirmButton
              label="Undo"
              onConfirm={async () => {
                await apiCall(`/api/sales/${s.id}`, "DELETE");
                mutate();
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
