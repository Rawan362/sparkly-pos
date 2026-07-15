"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabaseClient";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import { useSeller } from "./SellerContext";
import type { StaffMember, StaffRole } from "./types";

const STORAGE_KEY = "sparkly.staffMemberId";

type StaffContextValue = {
  staffMembers: StaffMember[];
  currentStaff: StaffMember | null;
  actorName: string;
  role: StaffRole;
  isStaffRole: boolean;
  switchToStaff: (staff: StaffMember, pin: string) => boolean;
  switchToOwner: () => void;
  reload: () => void;
};

const StaffContext = createContext<StaffContextValue | null>(null);

// Lightweight "who's working right now" switch for a shared device -- not
// a real auth system. No staff members configured means everyone acts as
// the Owner (admin), so nothing changes for sellers who never touch this.
export function StaffProvider({ children }: { children: ReactNode }) {
  const { sellerId } = useSeller();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [currentStaffId, setCurrentStaffIdState] = useState<string | null>(
    null
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Reading localStorage must happen client-side only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setCurrentStaffIdState(stored);
    setHydrated(true);
  }, []);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("staff_members")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setStaffMembers(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "staff_members",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const currentStaff = staffMembers.find((s) => s.id === currentStaffId) ?? null;

  const switchToStaff = (staff: StaffMember, pin: string) => {
    if (staff.pin !== pin) return false;
    window.localStorage.setItem(STORAGE_KEY, staff.id);
    setCurrentStaffIdState(staff.id);
    return true;
  };

  const switchToOwner = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setCurrentStaffIdState(null);
  };

  const role: StaffRole = currentStaff?.role ?? "admin";

  const value = useMemo(
    () => ({
      staffMembers,
      currentStaff,
      actorName: currentStaff?.name ?? "Owner",
      role,
      isStaffRole: role === "staff",
      switchToStaff,
      switchToOwner,
      reload: load,
    }),
    [staffMembers, currentStaff, role, load]
  );

  if (!hydrated) return null;

  return (
    <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
