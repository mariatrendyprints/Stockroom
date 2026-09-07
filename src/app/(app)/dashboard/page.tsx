"use client";

import { useLiveEvents } from "@/hooks/useLiveEvents";
import DashboardStats from "@/components/DashboardStats";
import ItemsPanel from "@/components/ItemsPanel";
import ServicesPanel from "@/components/ServicesPanel";
import SellForm from "@/components/SellForm";
import ActivityFeed from "@/components/ActivityFeed";

export default function DashboardPage() {
  useLiveEvents();

  return (
    <div>
      <DashboardStats />
      <div className="grid grid-cols-1 wk:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <ItemsPanel />
          <ServicesPanel />
        </div>
        <div className="space-y-4 min-w-0">
          <SellForm />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
