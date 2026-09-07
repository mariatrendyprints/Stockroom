"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatPeso } from "@/lib/money";
import StatTile from "@/components/StatTile";

type Stats = {
  revenue: number;
  netSales: number;
  unitsSold: number;
  inventoryValue: number;
  lowStockCount: number;
};

export default function DashboardStats() {
  const { data } = useSWR<Stats>("/api/stats", fetcher);

  if (!data) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 h-[76px]" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <StatTile label="Revenue" value={formatPeso(data.revenue)} />
      <StatTile label="Net Sales" value={formatPeso(data.netSales)} />
      <StatTile label="Units Sold" value={String(data.unitsSold)} />
      <StatTile label="Inventory Value" value={formatPeso(data.inventoryValue)} />
      <StatTile
        label="Low Stock"
        value={String(data.lowStockCount)}
        tone={data.lowStockCount > 0 ? "amber" : "default"}
      />
    </div>
  );
}
