"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useSeller } from "@/lib/SellerContext";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkout", label: "Checkout" },
  { href: "/products", label: "Products" },
  { href: "/stock", label: "Stock" },
  { href: "/pricing-tiers", label: "Pricing Tiers" },
  { href: "/units", label: "Units" },
  { href: "/orders", label: "Orders" },
  { href: "/expenses", label: "Expenses" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings" },
];

const COLLAPSE_STORAGE_KEY = "sparkly.sidebarCollapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { sellerId, seller, signOut } = useSeller();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    // Restores the desktop-only collapsed preference from a previous visit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "1") setCollapsedState(true);
  }, []);

  const setCollapsed = (next: boolean) => {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
    setCollapsedState(next);
  };

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
    <>
      {/* Desktop-only collapse/expand handle. Fixed to the viewport (not
          the aside) so it stays put and visible whether the sidebar is
          open or collapsed. */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        className={clsx(
          "fixed top-1/2 z-20 hidden -translate-y-1/2 rounded-r-md border border-l-0 border-paper-line bg-paper-raised px-1 py-3 text-xs text-ink-faint shadow-sm transition-[left] duration-200 hover:text-brass-dark sm:block print:hidden",
          collapsed ? "left-0" : "left-60"
        )}
      >
        {collapsed ? "›" : "‹"}
      </button>

      <aside
        className={clsx(
          "sticky top-0 z-10 flex max-h-screen flex-col border-b border-paper-line bg-paper/95 backdrop-blur sm:h-screen sm:shrink-0 sm:border-b-0 sm:border-r sm:overflow-hidden sm:transition-[width] sm:duration-200",
          collapsed ? "sm:w-0 sm:border-r-0 sm:invisible" : "sm:w-60"
        )}
      >
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
    </>
  );
}
