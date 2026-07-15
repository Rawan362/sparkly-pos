"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useStaff } from "@/lib/StaffContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { StaffMember, StaffRole } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Stamp } from "@/components/ui/Stamp";

export default function StaffPage() {
  const { sellerId } = useSeller();
  const { isStaffRole } = useStaff();
  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("staff_members")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setMembers(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "staff_members",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || !name.trim() || !pin.trim()) return;
    setAdding(true);
    await supabase.from("staff_members").insert({
      chat_id: sellerId,
      name: name.trim(),
      pin: pin.trim(),
      role,
    });
    setName("");
    setPin("");
    setRole("staff");
    setAdding(false);
    load();
  };

  const update = async (id: string, patch: Partial<StaffMember>) => {
    setMembers(
      (prev) => prev?.map((m) => (m.id === id ? { ...m, ...patch } : m)) ?? null
    );
    await supabase.from("staff_members").update(patch).eq("id", id);
  };

  const remove = async (id: string) => {
    setMembers((prev) => prev?.filter((m) => m.id !== id) ?? null);
    await supabase.from("staff_members").delete().eq("id", id);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <p className="text-sm text-ink-soft">
          Add a name and PIN for each person who uses this device — Admins
          see everything, Staff get view-only access to Dashboard and
          Settings but can still run day-to-day work.
        </p>
      </div>

      {isStaffRole && (
        <div className="mb-4 rounded-md border border-brass/40 bg-brass-soft/60 px-4 py-2.5 text-sm text-brass-dark">
          You&apos;re signed in as Staff — this page is view-only.
        </div>
      )}

      {!members ? (
        <p className="text-ink-soft">Loading staff…</p>
      ) : (
        <div className="paper-card mb-6 divide-y divide-paper-line">
          {members.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-soft">
              No staff added yet — everyone acts as Owner/Admin until you add
              someone below.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="max-w-[200px]">
                    <InlineEdit
                      value={m.name}
                      onSave={(v) => update(m.id, { name: v })}
                      disabled={isStaffRole}
                    />
                  </div>
                  <p className="tabular text-xs text-ink-faint">
                    PIN: {m.pin}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <select
                    value={m.role}
                    disabled={isStaffRole}
                    onChange={(e) =>
                      update(m.id, { role: e.target.value as StaffRole })
                    }
                    className="rounded-md border border-paper-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-brass disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                  <Stamp tone={m.role === "admin" ? "brass" : "ink"}>
                    {m.role}
                  </Stamp>
                  {!isStaffRole && (
                    <button
                      onClick={() => remove(m.id)}
                      className="text-xs font-medium text-stamp-red hover:opacity-70"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isStaffRole && (
        <form
          onSubmit={addMember}
          className="paper-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-ink-soft">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sara"
              className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
            />
          </label>
          <label className="text-sm sm:w-28">
            <span className="mb-1 block text-ink-soft">PIN</span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="1234"
              className="tabular w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
            />
          </label>
          <label className="text-sm sm:w-32">
            <span className="mb-1 block text-ink-soft">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={adding || !name.trim() || !pin.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            Add staff
          </button>
        </form>
      )}
    </div>
  );
}
