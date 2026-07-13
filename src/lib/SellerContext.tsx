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
import type { Seller } from "./types";

const STORAGE_KEY = "sparkly.sellerId";

type SellerContextValue = {
  sellerId: string | null;
  seller: Seller | null;
  loading: boolean;
  setSellerId: (id: string | null) => void;
  signOut: () => void;
};

const SellerContext = createContext<SellerContextValue | null>(null);

// Everything the rest of the app knows about "who is signed in" flows
// through this hook. Today the identity comes from a plain text box and
// localStorage; a real login system can replace only the inside of this
// file (e.g. read the seller id from a Supabase Auth session instead)
// without touching any page or component that calls useSeller().
export function SellerProvider({ children }: { children: ReactNode }) {
  const [sellerId, setSellerIdState] = useState<string | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Reading localStorage must happen client-side only, to avoid an
    // SSR/CSR markup mismatch between the sign-in gate and the app shell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSellerIdState(stored);
    setHydrated(true);
  }, []);

  const loadSeller = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("sellers")
      .select("*")
      .eq("chat_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        setSeller(data ?? null);
        setLoading(false);
      });
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) {
      // Clears stale seller data when signing out / switching sellers.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeller(null);
      return;
    }
    setLoading(true);
    // Fetches the seller row for the newly selected chat_id.
    loadSeller();
  }, [sellerId, loadSeller]);

  // So edits made elsewhere (Settings' business phone, or Ahmad himself in
  // chat) show up immediately without switching sellers or reloading.
  useRealtimeRefresh(
    "sellers",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    loadSeller
  );

  const setSellerId = (id: string | null) => {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSellerIdState(id);
  };

  const value = useMemo(
    () => ({
      sellerId,
      seller,
      loading,
      setSellerId,
      signOut: () => setSellerId(null),
    }),
    [sellerId, seller, loading]
  );

  if (!hydrated) return null;

  return (
    <SellerContext.Provider value={value}>{children}</SellerContext.Provider>
  );
}

export function useSeller() {
  const ctx = useContext(SellerContext);
  if (!ctx) throw new Error("useSeller must be used within SellerProvider");
  return ctx;
}
