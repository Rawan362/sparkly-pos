"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useState } from "react";
import { useSeller } from "@/lib/SellerContext";

const TABS = [
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/pricing-tiers", label: "Pricing Tiers" },
  { href: "/units", label: "Units" },
  { href: "/orders", label: "Orders" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const { sellerId, seller, signOut } = useSeller();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-paper-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
            Sparkly POS
          </p>
          <p className="truncate text-sm text-ink-soft">
            {seller?.business_name_location || `Seller ${sellerId}`}
          </p>
        </div>
        {confirmingSignOut ? (
          <div className="flex shrink-0 items-center gap-2 text-xs">
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
            className="shrink-0 rounded border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brass hover:text-brass-dark"
          >
            Switch seller
          </button>
        )}
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-1 sm:px-4">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "shrink-0 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-b-2 border-brass text-ink"
                  : "border-b-2 border-transparent text-ink-faint hover:text-ink-soft"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
