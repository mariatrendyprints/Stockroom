"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatPeso } from "@/lib/money";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { downloadCsv } from "@/lib/csv";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function thisMonthStr() {
  return todayStr().slice(0, 7);
}

function DownloadCsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs rounded-md border border-border px-2 py-1 text-ink-muted hover:text-ink hover:border-ink-faint transition-colors"
    >
      Download CSV
    </button>
  );
}

type DailyReport = {
  date: string;
  sales: { id: string; refName: string; qty: number; amount: number; cost: number; at: string }[];
  totals: { revenue: number; netSales: number; unitsSold: number };
  stockRows: { unitId: string; label: string; opening: number | null; closing: number }[];
};
type MonthlyReport = {
  month: string;
  totals: { revenue: number; netSales: number; unitsSold: number };
  days: { date: string; revenue: number; netSales: number; unitsSold: number }[];
};

export default function ReportsPage() {
  useLiveEvents();
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(thisMonthStr());

  const { data: daily } = useSWR<DailyReport>(`/api/reports/daily?date=${date}`, fetcher);
  const { data: monthly } = useSWR<MonthlyReport>(`/api/reports/monthly?month=${month}`, fetcher);

  return (
    <div className="space-y-8">
      <section className="rounded-card border border-border bg-surface">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Daily report</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono"
          />
        </div>
        {!daily ? (
          <p className="text-sm text-ink-muted px-4 py-6">Loading…</p>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-ink-muted">Revenue</div>
                <div className="font-mono">{formatPeso(daily.totals.revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Net Sales</div>
                <div className="font-mono">{formatPeso(daily.totals.netSales)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Units Sold</div>
                <div className="font-mono">{daily.totals.unitsSold}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Sales</h3>
                <DownloadCsvButton
                  onClick={() =>
                    downloadCsv(
                      `stockroom-sales-${daily.date}.csv`,
                      ["Time", "Item/Service", "Qty", "Amount", "Cost", "Net"],
                      daily.sales.map((s) => [
                        new Date(s.at).toLocaleString("en-PH"),
                        s.refName,
                        s.qty,
                        s.amount.toFixed(2),
                        s.cost.toFixed(2),
                        (s.amount - s.cost).toFixed(2),
                      ])
                    )
                  }
                />
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {daily.sales.length === 0 && (
                    <tr>
                      <td className="text-ink-muted py-2">No sales this day.</td>
                    </tr>
                  )}
                  {daily.sales.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-1.5">
                        {s.qty} × {s.refName}
                      </td>
                      <td className="py-1.5 text-right font-mono">{formatPeso(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Opening vs. closing stock</h3>
                <DownloadCsvButton
                  onClick={() =>
                    downloadCsv(
                      `stockroom-stock-${daily.date}.csv`,
                      ["Item (unit)", "Opening", "Closing"],
                      daily.stockRows.map((r) => [r.label, r.opening === null ? "" : r.opening, r.closing])
                    )
                  }
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-muted">
                    <th className="font-normal pb-1">Item (unit)</th>
                    <th className="font-normal pb-1">Opening</th>
                    <th className="font-normal pb-1">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.stockRows.map((r) => (
                    <tr key={r.unitId} className="border-t border-border">
                      <td className="py-1.5">{r.label}</td>
                      <td className="py-1.5 font-mono">{r.opening === null ? "—" : r.opening}</td>
                      <td className="py-1.5 font-mono">{r.closing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold">Monthly report</h2>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono"
            />
            {monthly && (
              <DownloadCsvButton
                onClick={() =>
                  downloadCsv(
                    `stockroom-monthly-${monthly.month}.csv`,
                    ["Date", "Revenue", "Net Sales", "Units"],
                    monthly.days.map((d) => [d.date, d.revenue.toFixed(2), d.netSales.toFixed(2), d.unitsSold])
                  )
                }
              />
            )}
          </div>
        </div>
        {!monthly ? (
          <p className="text-sm text-ink-muted px-4 py-6">Loading…</p>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-ink-muted">Revenue</div>
                <div className="font-mono">{formatPeso(monthly.totals.revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Net Sales</div>
                <div className="font-mono">{formatPeso(monthly.totals.netSales)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Units Sold</div>
                <div className="font-mono">{monthly.totals.unitsSold}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="font-normal pb-1">Date</th>
                  <th className="font-normal pb-1">Revenue</th>
                  <th className="font-normal pb-1">Net Sales</th>
                  <th className="font-normal pb-1">Units</th>
                </tr>
              </thead>
              <tbody>
                {monthly.days.length === 0 && (
                  <tr>
                    <td className="text-ink-muted py-2">No activity this month.</td>
                  </tr>
                )}
                {monthly.days.map((d) => (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-1.5 font-mono">{d.date}</td>
                    <td className="py-1.5 font-mono">{formatPeso(d.revenue)}</td>
                    <td className="py-1.5 font-mono">{formatPeso(d.netSales)}</td>
                    <td className="py-1.5 font-mono">{d.unitsSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
