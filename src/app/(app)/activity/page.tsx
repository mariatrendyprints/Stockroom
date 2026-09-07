"use client";

import { useSession } from "next-auth/react";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import SellForm from "@/components/SellForm";
import ActivityFeed from "@/components/ActivityFeed";

export default function ActivityPage() {
  useLiveEvents();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="grid grid-cols-1 wk:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start max-w-3xl wk:max-w-none mx-auto">
      <SellForm />
      {isAdmin && <ActivityFeed />}
    </div>
  );
}
