/**
 * Marketplace & subscription monetization constants (Stripe wiring comes later).
 */

/** Platform commission on completed sales (buyer pays full amount; seller receives net). */
export const PLATFORM_SALE_COMMISSION_RATE = 0.15;

export const LISTING_TTL_DAYS = 60;

/** Monthly add-on prices in USD (display + future billing). */
export const SUBSCRIPTION_PRICES_USD = {
  premiumListingMonthly: 29,
  proSellerMonthly: 9,
  investorMonthly: 99,
} as const;

export function platformFeeFromSaleUsd(salePriceUsd: number): number {
  const raw = salePriceUsd * PLATFORM_SALE_COMMISSION_RATE;
  return Math.round(raw * 100) / 100;
}

export function netToSellerUsd(salePriceUsd: number): number {
  const fee = platformFeeFromSaleUsd(salePriceUsd);
  return Math.round((salePriceUsd - fee) * 100) / 100;
}
