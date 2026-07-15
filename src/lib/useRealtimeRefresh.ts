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
  // supabase.channel() reuses an existing channel object if one with the
  // same topic string is already registered, so two components watching
  // the same table+filter at once (e.g. a page and the always-mounted
  // notifications bell) would otherwise share -- and fight over -- one
  // channel. useId() keeps every hook instance's channel independent.
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
  }, [table, filter]);
}
