"use client";

import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import type { CompletedSale } from "./cartMath";

export function WholesaleInvoice({
  sale,
  onNewSale,
  heading = "Sale complete",
  subheading = "Here's the wholesale invoice for this sale.",
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
  const balanceDue = sale.total - sale.paidAmount;

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
            <p className="text-lg font-semibold">{t("Invoice")}</p>
            {sale.invoiceNumber && (
              <p className="tabular text-sm text-ink-soft">
                {t("No.")} {sale.invoiceNumber}
              </p>
            )}
            <p className="tabular text-sm text-ink-soft">
              {new Date(sale.completedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <p>
            <span className="text-ink-soft">{t("Customer:")} </span>
            <span className="font-medium" dir="auto">
              {sale.customer?.name || t("Walk-in customer")}
            </span>
          </p>
          {sale.customer?.phone && (
            <p className="tabular text-ink-soft">{sale.customer.phone}</p>
          )}
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">{t("Product")}</th>
              <th className="py-2 pr-2 font-medium">{t("Code")}</th>
              <th className="py-2 pr-2 font-medium text-right">{t("Quantity")}</th>
              <th className="py-2 pr-2 font-medium text-right">{t("Unit Price")}</th>
              <th className="py-2 pl-2 font-medium text-right">{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((l, i) => (
              <tr key={i} className="border-b border-paper-line">
                <td className="tabular py-2 pr-2 text-ink-faint">{i + 1}</td>
                <td className="py-2 pr-2" dir="auto">
                  {l.name}
                </td>
                <td className="tabular py-2 pr-2 text-ink-soft">
                  {l.code || "—"}
                </td>
                <td className="tabular py-2 pr-2 text-right">
                  {l.quantity.toFixed(l.unitLabel ? 2 : 0)}
                  {l.unitLabel ? ` ${l.unitLabel}` : ""}
                </td>
                <td className="tabular py-2 pr-2 text-right">
                  {formatMoney(l.unitPrice)}
                </td>
                <td className="tabular py-2 pl-2 text-right font-medium">
                  {formatMoney(l.unitPrice * l.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex flex-wrap justify-between gap-6">
          <div className="text-sm">
            <p className="text-ink-soft">
              {sale.paidAmount > 0
                ? `${t("Paid")} (${t(sale.paymentMethod)})`
                : t("Payment")}
            </p>
            <p className="tabular font-medium">
              {sale.paidAmount > 0
                ? formatMoney(sale.paidAmount)
                : t("On debt")}
            </p>
            <p className="tabular text-xs text-ink-faint">
              {new Date(sale.completedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="min-w-[180px] text-sm">
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
                <span>{t("Shipping Charges")}</span>
                <span className="tabular">
                  {formatMoney(sale.shippingAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-paper-line pt-1 text-base font-semibold">
              <span>{t("Total")}</span>
              <span className="tabular">{formatMoney(sale.total)}</span>
            </div>
            {!sale.fullyPaid && (
              <div className="flex justify-between text-stamp-red">
                <span>{t("Balance due")}</span>
                <span className="tabular">{formatMoney(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          {t("Wholesale invoice — thank you for your business.")}
        </p>
      </div>
    </div>
  );
}
