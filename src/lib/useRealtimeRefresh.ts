"use client";

import { useEffect, useId } from "react";
import { supabase } from "./supabaseClient";

/**
 * Subscribes to Postgres changes on `table` (optionally filtered to one
 * seller's rows) and calls `onChange` whenever the bot or another tab
 * writes to it, so the dashboard stays live without a manual refresh.
 */
export function useRealtimeRefresh(
  table: string,
  filter: string | undefined,
  onChange: () => void
) {
  // Two components can legitimately subscribe to the same table+filter at
  // once (e.g. StaffContext app-wide and the Staff page). Supabase dedupes
  // channels by name, so a shared name would make the second .subscribe()
  // throw -- useId keeps each hook instance's channel unique.
  const instanceId = useId();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${filter ?? "all"}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, instanceId]);
}
