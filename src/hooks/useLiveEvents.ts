"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";

const POLL_INTERVAL_MS = 4000;

/**
 * Keeps every connected screen in sync by periodically revalidating the
 * SWR caches that inventory/sales/services mutations affect.
 *
 * This was originally a Server-Sent Events push (see git history if you
 * want it back), which only works when the app runs as one long-lived
 * Node process holding an in-memory list of connected clients. That's
 * incompatible with serverless hosts like Vercel — every request can land
 * on a different, short-lived function instance, and there's a hard
 * execution-time limit that an indefinitely-open connection would hit.
 * Polling has no such requirement, at the cost of updates landing every
 * few seconds instead of instantly. If near-instant cross-user sync
 * matters more than the added infrastructure, swap this for Supabase
 * Realtime (Postgres change broadcasts over websockets) instead.
 */
export function useLiveEvents() {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const tick = () => {
      mutate("/api/items");
      mutate("/api/services");
      mutate("/api/sellable");
      mutate("/api/stats");
      mutate("/api/settings");
      mutate((key) => typeof key === "string" && key.startsWith("/api/sales"));
      mutate((key) => typeof key === "string" && key.startsWith("/api/reports"));
    };

    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mutate]);
}
