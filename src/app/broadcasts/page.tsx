"use client";

import { useCallback, useEffect, useState } from "react";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { fetchSellerScopedTable, pickField, type ScopedFetchResult } from "@/lib/schemaProbe";
import { Stamp } from "@/components/ui/Stamp";

type BroadcastRow = {
  key: string;
  phone: string;
  status: string;
  lastBroadcastAt: string | null;
  followUpStage: string | null;
};

function statusTone(status: string): "green" | "red" | "brass" | "ink" {
  const s = status.toLowerCase();
  if (/(fail|error|bounce)/.test(s)) return "red";
  if (/(sent|delivered|success|complete)/.test(s)) return "green";
  if (/(pending|queued|scheduled)/.test(s)) return "brass";
  return "ink";
}

function toRows(raw: Record<string, unknown>[]): BroadcastRow[] {
  return raw.map((row, i) => {
    const phone = pickField(row, ["phone", "customer_phone", "recipient_phone"]);
    const status = pickField(row, ["status", "broadcast_status"]);
    const lastBroadcastAt = pickField(row, ["last_broadcast_at", "last_broadcast", "sent_at"]);
    const followUpStage = pickField(row, ["follow_up_stage", "followup_stage", "stage"]);
    const idVal = pickField(row, ["id"]);
    return {
      key: idVal != null ? String(idVal) : String(i),
      phone: phone != null ? String(phone) : "—",
      status: status != null ? String(status) : "unknown",
      lastBroadcastAt: lastBroadcastAt != null ? String(lastBroadcastAt) : null,
      followUpStage: followUpStage != null ? String(followUpStage) : null,
    };
  });
}

export default function BroadcastsPage() {
  const { sellerId } = useSeller();
  const [result, setResult] = useState<ScopedFetchResult | null>(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    fetchSellerScopedTable("broadcast_log", sellerId).then(setResult);
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh("broadcast_log", undefined, load);

  const rows =
    result?.status === "ok"
      ? toRows(result.rows).sort((a, b) =>
          (b.lastBroadcastAt ?? "").localeCompare(a.lastBroadcastAt ?? "")
        )
      : [];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Broadcasts</h1>
        <p className="text-sm text-ink-soft">
          WhatsApp broadcast outreach and follow-up status for this
          seller&apos;s customers. Read-only.
        </p>
      </div>

      {!result ? (
        <p className="text-ink-soft">Loading broadcasts…</p>
      ) : result.status === "missing_table" ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No broadcast data is set up for this seller yet.
        </div>
      ) : result.status === "unscoped" ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          Broadcast data exists but couldn&apos;t be matched to this seller
          yet.
        </div>
      ) : rows.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No broadcasts sent yet.
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last broadcast</th>
                <th className="px-4 py-3 font-medium">Follow-up stage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-paper-line last:border-0">
                  <td className="tabular px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">
                    <Stamp tone={statusTone(r.status)}>{r.status}</Stamp>
                  </td>
                  <td className="tabular px-4 py-2 text-ink-soft">
                    {r.lastBroadcastAt ? new Date(r.lastBroadcastAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{r.followUpStage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
