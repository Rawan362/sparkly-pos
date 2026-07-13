import type { Customer, PricingTier, SellerProduct } from "@/lib/types";

export type CartLine = { productId: string; quantity: number };

export type CompletedSale = {
  lines: {
    name: string;
    code: string | null;
    quantity: number;
    unitLabel: string | null;
    unitPrice: number;
    total: number;
  }[];
  customer: Customer | null;
  tierName: string | null;
  isWholesale: boolean;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  fullyPaid: boolean;
  invoiceNumber: string | null;
  completedAt: string;
};

export function unitPriceFor(
  product: SellerProduct,
  tier: PricingTier | null
): number {
  const base = product.retail_price ?? 0;
  if (!tier) return base;
  return base * (1 + tier.adjustment_percent / 100);
}

// Splits `total` across `weights` proportionally, rounded to cents, with the
// last entry absorbing the rounding remainder so the parts always sum back
// to exactly `total` -- important since each cart line becomes its own
// orders row and the dashboard sums order_total across all of them.
export function apportion(weights: number[], total: number): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0 || weights.length === 0) return weights.map(() => 0);

  const result: number[] = [];
  let assigned = 0;
  weights.forEach((w, i) => {
    if (i === weights.length - 1) {
      result.push(Math.round((total - assigned) * 100) / 100);
    } else {
      const share = Math.round(((w / weightSum) * total) * 100) / 100;
      result.push(share);
      assigned += share;
    }
  });
  return result;
}
