"use client";

import type { ReactNode } from "react";
import { useSeller } from "@/lib/SellerContext";
import { SellerGate } from "@/components/SellerGate";
import { Nav } from "@/components/Nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { sellerId } = useSeller();

  if (!sellerId) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <SellerGate />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
