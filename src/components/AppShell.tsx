"use client";

import type { ReactNode } from "react";
import { useSeller } from "@/lib/SellerContext";
import { SellerGate } from "@/components/SellerGate";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

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
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
