"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useState } from "react";
import { useSeller } from "@/lib/SellerContext";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/pricing-tiers", label: "Pricing Tiers" },
  { href: "/units", label: "Units" },
  { href: "/orders", label: "Orders" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sellerId, seller, signOut } = useSeller();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const switchSellerControl = confirmingSignOut ? (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-ink-soft">Switch seller?</span>
      <button
        onClick={signOut}
        className="rounded border border-stamp-red px-2 py-1 font-semibold text-stamp-red"
      >
        Yes
      </button>
      <button
        onClick={() => setConfirmingSignOut(false)}
        className="rounded border border-paper-line px-2 py-1 text-ink-soft"
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirmingSignOut(true)}
      className="rounded border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brass hover:text-brass-dark sm:w-full"
    >
      Switch seller
    </button>
  );

  return (
    <aside className="sticky top-0 z-10 flex max-h-screen flex-col border-b border-paper-line bg-paper/95 backdrop-blur sm:h-screen sm:w-60 sm:shrink-0 sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:block sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
            Sparkly POS
          </p>
          <p className="truncate text-sm text-ink-soft">
            {seller?.business_name_location || `Seller ${sellerId}`}
          </p>
        </div>
        <div className="shrink-0 sm:hidden">{switchSellerControl}</div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-1 sm:flex-col sm:gap-0.5 sm:overflow-x-visible sm:overflow-y-auto sm:px-3 sm:pb-4">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "border-b-2 sm:border-b-0 sm:border-l-4",
                active
                  ? "border-brass text-ink sm:bg-brass-soft/50"
                  : "border-transparent text-ink-faint hover:text-ink-soft"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-paper-line px-3 py-3 sm:block sm:mt-auto">
        {switchSellerControl}
      </div>
    </aside>
  );
}
