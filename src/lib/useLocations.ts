"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { useSeller } from "./SellerContext";
import { useRealtimeRefresh } from "./useRealtimeRefresh";
import type { Location } from "./types";

// Creates the seller's first "Main Location" the moment we can see they
// have none yet, and copies each product's existing stock_quantity /
// low_stock_threshold into product_stock_by_location for that location --
// so an existing single-location seller's numbers show up unchanged under
// "Main Location" instead of appearing to reset to empty. Safe to call
// more than once: it re-checks for an existing location immediately before
// inserting.
async function ensureDefaultLocation(chatId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("chat_id", chatId)
    .limit(1);
  if (existing && existing.length > 0) return;

  const { data: inserted, error } = await supabase
    .from("locations")
    .insert({ chat_id: chatId, name: "Main Location", is_default: true })
    .select()
    .single();
  if (error || !inserted) return;

  const { data: products } = await supabase
    .from("seller_products")
    .select("id, stock_quantity, low_stock_threshold")
    .eq("chat_id", chatId);
  if (!products || products.length === 0) return;

  const rows = products.map((p) => ({
    product_id: p.id,
    location_id: inserted.id,
    stock_quantity: p.stock_quantity,
    low_stock_threshold: p.low_stock_threshold,
  }));
  await supabase.from("product_stock_by_location").insert(rows);
}

export function useLocations() {
  const { sellerId } = useSeller();
  const [locations, setLocations] = useState<Location[] | null>(null);
  const bootstrapping = useRef(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("locations")
      .select("*")
      .eq("chat_id", sellerId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setLocations(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    // Resets to loading state on seller change before the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocations(null);
    load();
  }, [load]);

  useRealtimeRefresh(
    "locations",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  useEffect(() => {
    if (!sellerId || locations === null || locations.length > 0) return;
    if (bootstrapping.current) return;
    bootstrapping.current = true;
    ensureDefaultLocation(sellerId).then(() => {
      bootstrapping.current = false;
      load();
    });
  }, [sellerId, locations, load]);

  const defaultLocation =
    locations?.find((l) => l.is_default) ?? locations?.[0] ?? null;

  return {
    locations,
    defaultLocation,
    loading: locations === null,
    reload: load,
  };
}
