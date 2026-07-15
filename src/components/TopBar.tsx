"use client";

import { GlobalSearch } from "@/components/topbar/GlobalSearch";
import { NotificationsBell } from "@/components/topbar/NotificationsBell";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-paper-line bg-paper/95 px-4 py-3 backdrop-blur sm:px-8 print:hidden">
      <GlobalSearch />
      <NotificationsBell />
    </header>
  );
}
