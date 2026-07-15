"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";

type NavLink = { href: string; label: string };
type NavEntry =
  | ({ kind: "link" } & NavLink)
  | { kind: "group"; label: string; links: NavLink[] };

const NAV: NavEntry[] = [
  { kind: "link", href: "/dashboard", label: "Dashboard" },
  { kind: "link", href: "/pos", label: "POS" },
  { kind: "link", href: "/products", label: "Products" },
  { kind: "link", href: "/stock", label: "Stock" },
  {
    kind: "group",
    label: "Purchasing",
    links: [
      { href: "/suppliers", label: "Suppliers" },
      { href: "/purchases", label: "Purchases" },
    ],
  },
  { kind: "link", href: "/pricing-tiers", label: "Pricing Tiers" },
  { kind: "link", href: "/units", label: "Units" },
  { kind: "link", href: "/orders", label: "Orders" },
  { kind: "link", href: "/invoices", label: "Invoices" },
  { kind: "link", href: "/expenses", label: "Expenses" },
  { kind: "link", href: "/customers", label: "Customers" },
  { kind: "link", href: "/settings", label: "Settings" },
];

const COLLAPSE_STORAGE_KEY = "sparkly.sidebarCollapsed";

function navLinkClass(active: boolean) {
  return clsx(
    "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "border-b-2 sm:border-b-0 sm:border-l-4",
    active
      ? "border-brass text-ink sm:bg-brass-soft/50"
      : "border-transparent text-ink-faint hover:text-ink-soft"
  );
}

function NavGroup({
  label,
  links,
  pathname,
}: {
  label: string;
  links: NavLink[];
  pathname: string | null;
}) {
  const hasActiveChild = links.some((l) => pathname?.startsWith(l.href));
  const [open, setOpen] = useState(hasActiveChild);
  const { t } = useSettings();

  return (
    <div className="contents sm:block">
      {/* Mobile: no dropdown, just show the links inline in the scroll row. */}
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={clsx(navLinkClass(pathname?.startsWith(l.href) ?? false), "sm:hidden")}
        >
          {t(l.label)}
        </Link>
      ))}

      {/* Desktop: collapsible group. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hidden w-full items-center justify-between gap-2 rounded-md px-3 pt-3 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-brass-dark sm:flex"
      >
        {t(label)}
        <span
          className={clsx(
            "text-base leading-none transition-transform duration-200 ease-out",
            open && "rotate-90"
          )}
        >
          ›
        </span>
      </button>
      <div
        className={clsx(
          "hidden sm:grid sm:grid-cols-1 overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
          open ? "sm:grid-rows-[1fr]" : "sm:grid-rows-[0fr]"
        )}
      >
        <div className="flex min-h-0 flex-col gap-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={navLinkClass(pathname?.startsWith(l.href) ?? false)}
            >
              {t(l.label)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sellerId, seller, signOut } = useSeller();
  const { t } = useSettings();
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
      <span className="text-ink-soft">{t("Switch seller?")}</span>
      <button
        onClick={signOut}
        className="rounded border border-stamp-red px-2 py-1 font-semibold text-stamp-red"
      >
        {t("Yes")}
      </button>
      <button
        onClick={() => setConfirmingSignOut(false)}
        className="rounded border border-paper-line px-2 py-1 text-ink-soft"
      >
        {t("Cancel")}
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirmingSignOut(true)}
      className="rounded border border-paper-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brass hover:text-brass-dark sm:w-full"
    >
      {t("Switch seller")}
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
              {seller?.business_name_location || `${t("Seller")} ${sellerId}`}
            </p>
          </div>
          <div className="shrink-0 sm:hidden">{switchSellerControl}</div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:flex-1 sm:flex-col sm:gap-0.5 sm:overflow-x-visible sm:overflow-y-auto sm:px-3 sm:pb-4">
          {NAV.map((entry) =>
            entry.kind === "link" ? (
              <Link
                key={entry.href}
                href={entry.href}
                className={navLinkClass(pathname?.startsWith(entry.href) ?? false)}
              >
                {t(entry.label)}
              </Link>
            ) : (
              <NavGroup
                key={entry.label}
                label={entry.label}
                links={entry.links}
                pathname={pathname}
              />
            )
          )}
        </nav>

        <div className="hidden border-t border-paper-line px-3 py-3 sm:block sm:mt-auto">
          {switchSellerControl}
        </div>
      </aside>
    </>
  );
}
