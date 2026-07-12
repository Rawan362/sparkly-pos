"use client";

import { useState } from "react";
import { useSeller } from "@/lib/SellerContext";

export function SellerGate() {
  const { setSellerId } = useSeller();
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="paper-card w-full max-w-md px-8 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">
          Sparkly POS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Open your ledger
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Enter the Seller ID (your Telegram chat ID with Ahmad) to load your
          business. This is the same account the bot already uses — nothing
          new to set up.
        </p>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = value.trim();
            if (trimmed) setSellerId(trimmed);
          }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 5023491872"
            className="w-full rounded-md border border-paper-line bg-paper px-4 py-3 text-ink tabular outline-none focus:border-brass"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-md bg-ink px-4 py-3 text-sm font-semibold uppercase tracking-wide text-paper-raised transition-opacity disabled:opacity-40"
          >
            Open ledger
          </button>
        </form>
      </div>
    </div>
  );
}
