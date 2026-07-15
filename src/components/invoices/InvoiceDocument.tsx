"use client";

import { useSeller } from "@/lib/SellerContext";
import { Stamp } from "@/components/ui/Stamp";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const STATUS_TONE: Record<InvoiceStatus, "ink" | "brass" | "green"> = {
  draft: "ink",
  sent: "brass",
  paid: "green",
};

export function InvoiceDocument({
  invoice,
  onBack,
}: {
  invoice: Invoice;
  onBack: () => void;
}) {
  const { seller } = useSeller();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Invoice</h1>
          <p className="text-sm text-ink-soft">Formal invoice document.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brass"
          >
            Print
          </button>
          <button
            onClick={onBack}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            Back to invoices
          </button>
        </div>
      </div>

      <div className="paper-card mx-auto max-w-2xl px-8 py-8 print:border-none print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-paper-line pb-4">
          <div>
            <h2 className="text-xl font-semibold" dir="auto">
              {seller?.business_name_location}
            </h2>
            {seller?.business_phone && (
              <p className="tabular text-sm text-ink-soft">
                {seller.business_phone}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Invoice</p>
            {invoice.invoice_number && (
              <p className="tabular text-sm text-ink-soft">
                No. {invoice.invoice_number}
              </p>
            )}
            <p className="tabular text-sm text-ink-soft">
              {new Date(invoice.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            <span className="text-ink-soft">Customer: </span>
            <span className="tabular font-medium">
              {invoice.customer_phone || "Walk-in customer"}
            </span>
          </p>
          <Stamp tone={STATUS_TONE[invoice.status]}>{invoice.status}</Stamp>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">Product</th>
              <th className="py-2 pr-2 font-medium">Code</th>
              <th className="py-2 pr-2 font-medium text-right">Quantity</th>
              <th className="py-2 pr-2 font-medium text-right">Unit Price</th>
              <th className="py-2 pl-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((l, i) => (
              <tr key={i} className="border-b border-paper-line">
                <td className="tabular py-2 pr-2 text-ink-faint">{i + 1}</td>
                <td className="py-2 pr-2" dir="auto">
                  {l.name}
                </td>
                <td className="tabular py-2 pr-2 text-ink-soft">
                  {l.code || "—"}
                </td>
                <td className="tabular py-2 pr-2 text-right">{l.quantity}</td>
                <td className="tabular py-2 pr-2 text-right">
                  {l.unit_price.toLocaleString()}
                </td>
                <td className="tabular py-2 pl-2 text-right font-medium">
                  {l.total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <div className="min-w-[180px] text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular">
                {invoice.subtotal.toLocaleString()}
              </span>
            </div>
            {invoice.shipping > 0 && (
              <div className="flex justify-between text-ink-soft">
                <span>Shipping</span>
                <span className="tabular">
                  {invoice.shipping.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-paper-line pt-1 text-base font-semibold">
              <span>Total</span>
              <span className="tabular">{invoice.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Thank you for your business.
        </p>
      </div>
    </div>
  );
}
