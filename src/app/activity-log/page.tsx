"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { ActivityLogEntry } from "@/lib/types";

export default function ActivityLogPage() {
  const { sellerId } = useSeller();
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("activity_log")
      .select("*")
      .eq("chat_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setEntries(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "activity_log",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Activity Log</h1>
        <p className="text-sm text-ink-soft">
          A read-only feed of what&apos;s happened on this account — products
          added or edited, order status changes, and stock adjustments.
        </p>
      </div>

      {!entries ? (
        <p className="text-ink-soft">Loading activity…</p>
      ) : entries.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          Nothing logged yet — actions will show up here as they happen.
        </div>
      ) : (
        <div className="paper-card divide-y divide-paper-line">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm" dir="auto">
                  <span className="font-medium">{e.actor_name}</span>{" "}
                  <span className="text-ink-soft">{e.action_description}</span>
                </p>
              </div>
              <p className="tabular shrink-0 text-xs text-ink-faint">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
