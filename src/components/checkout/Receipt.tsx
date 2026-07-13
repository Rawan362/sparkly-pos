"use client";

import { useSeller } from "@/lib/SellerContext";
import type { CompletedSale } from "./cartMath";

export type { CompletedSale };

export function Receipt({
  sale,
  onNewSale,
}: {
  sale: CompletedSale;
  onNewSale: () => void;
}) {
  const { seller } = useSeller();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Sale complete</h1>
          <p className="text-sm text-ink-soft">
            Here&apos;s the receipt for this sale.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brass"
          >
            Print
          </button>
          <button
            onClick={onNewSale}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            New sale
          </button>
        </div>
      </div>

      <div className="paper-card mx-auto max-w-md px-6 py-6 print:border-none print:shadow-none">
        <div className="text-center">
          <p className="font-semibold" dir="auto">
            {seller?.business_name_location}
          </p>
          {seller?.business_phone && (
            <p className="tabular text-xs text-ink-soft">
              {seller.business_phone}
            </p>
          )}
          <p className="tabular text-xs text-ink-faint">
            {new Date(sale.completedAt).toLocaleString()}
          </p>
          {sale.invoiceNumber && (
            <p className="tabular text-xs text-ink-faint">
              Invoice {sale.invoiceNumber}
            </p>
          )}
        </div>

        <div className="my-4 border-t border-dashed border-paper-line" />

        {sale.customer && (
          <p className="mb-3 text-sm text-ink-soft" dir="auto">
            Customer: {sale.customer.name || sale.customer.phone}
          </p>
        )}
        {sale.tierName && (
          <p className="mb-3 text-sm text-ink-soft">
            Pricing tier: {sale.tierName}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Product</th>
                <th className="py-1.5 pr-2 font-medium">Code</th>
                <th className="py-1.5 pr-2 font-medium text-right">Quantity</th>
                <th className="py-1.5 pr-2 font-medium text-right">
                  Unit Price
                </th>
                <th className="py-1.5 pl-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((l, i) => (
                <tr key={i} className="border-b border-paper-line last:border-0">
                  <td className="tabular py-1.5 pr-2 text-ink-faint">
                    {i + 1}
                  </td>
                  <td className="py-1.5 pr-2" dir="auto">
                    {l.name}
                  </td>
                  <td className="tabular py-1.5 pr-2 text-ink-soft">
                    {l.code || "—"}
                  </td>
                  <td className="tabular py-1.5 pr-2 text-right">
                    {l.quantity.toFixed(l.unitLabel ? 2 : 0)}
                    {l.unitLabel ? ` ${l.unitLabel}` : ""}
                  </td>
                  <td className="tabular py-1.5 pr-2 text-right">
                    {l.unitPrice.toLocaleString()}
                  </td>
                  <td className="tabular py-1.5 pl-2 text-right font-medium">
                    {(l.unitPrice * l.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="my-4 border-t border-dashed border-paper-line" />

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="tabular">{sale.subtotal.toLocaleString()}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>Discount</span>
              <span className="tabular">
                −{sale.discountAmount.toLocaleString()}
              </span>
            </div>
          )}
          {sale.shippingAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>Shipping</span>
              <span className="tabular">
                +{sale.shippingAmount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="tabular">{sale.total.toLocaleString()}</span>
          </div>
          {sale.paidAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>Paid ({sale.paymentMethod})</span>
              <span className="tabular">
                {sale.paidAmount.toLocaleString()}
              </span>
            </div>
          )}
          {!sale.fullyPaid && (
            <div className="flex justify-between text-stamp-red">
              <span>{sale.paidAmount > 0 ? "Balance due" : "On debt"}</span>
              <span className="tabular">
                {(sale.total - sale.paidAmount).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">Thank you</p>
      </div>
    </div>
  );
}
