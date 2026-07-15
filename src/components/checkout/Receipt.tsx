"use client";

import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import type { CompletedSale } from "./cartMath";

export type { CompletedSale };

export function Receipt({
  sale,
  onNewSale,
  heading = "Sale complete",
  subheading = "Here's the receipt for this sale.",
  actionLabel = "New sale",
}: {
  sale: CompletedSale;
  onNewSale: () => void;
  heading?: string;
  subheading?: string;
  actionLabel?: string;
}) {
  const { seller } = useSeller();
  const { t, formatMoney } = useSettings();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{t(heading)}</h1>
          <p className="text-sm text-ink-soft">{t(subheading)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brass"
          >
            {t("Print")}
          </button>
          <button
            onClick={onNewSale}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            {t(actionLabel)}
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
              {t("Invoice")} {sale.invoiceNumber}
            </p>
          )}
        </div>

        <div className="my-4 border-t border-dashed border-paper-line" />

        {sale.customer && (
          <p className="mb-3 text-sm text-ink-soft" dir="auto">
            {t("Customer:")} {sale.customer.name || sale.customer.phone}
          </p>
        )}
        {sale.tierName && (
          <p className="mb-3 text-sm text-ink-soft">
            {t("Pricing tier:")} {sale.tierName}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">{t("Product")}</th>
                <th className="py-1.5 pr-2 font-medium">{t("Code")}</th>
                <th className="py-1.5 pr-2 font-medium text-right">{t("Quantity")}</th>
                <th className="py-1.5 pr-2 font-medium text-right">
                  {t("Unit Price")}
                </th>
                <th className="py-1.5 pl-2 font-medium text-right">{t("Total")}</th>
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
                    {formatMoney(l.unitPrice)}
                  </td>
                  <td className="tabular py-1.5 pl-2 text-right font-medium">
                    {formatMoney(l.unitPrice * l.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="my-4 border-t border-dashed border-paper-line" />

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>{t("Subtotal")}</span>
            <span className="tabular">{formatMoney(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>{t("Discount")}</span>
              <span className="tabular">
                −{formatMoney(sale.discountAmount)}
              </span>
            </div>
          )}
          {sale.shippingAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>{t("Shipping")}</span>
              <span className="tabular">
                +{formatMoney(sale.shippingAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <span>{t("Total")}</span>
            <span className="tabular">{formatMoney(sale.total)}</span>
          </div>
          {sale.paidAmount > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>{t("Paid")} ({t(sale.paymentMethod)})</span>
              <span className="tabular">
                {formatMoney(sale.paidAmount)}
              </span>
            </div>
          )}
          {!sale.fullyPaid && (
            <div className="flex justify-between text-stamp-red">
              <span>{sale.paidAmount > 0 ? t("Balance due") : t("On debt")}</span>
              <span className="tabular">
                {formatMoney(sale.total - sale.paidAmount)}
              </span>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">{t("Thank you")}</p>
      </div>
    </div>
  );
}
