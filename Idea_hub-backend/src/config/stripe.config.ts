export function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? '';
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? '';
}

export function stripePriceProMonthly(): string {
  return process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? '';
}

export function stripePriceProYearly(): string {
  return process.env.STRIPE_PRICE_PRO_YEARLY?.trim() ?? '';
}

export function stripePriceInvestorMonthly(): string {
  return process.env.STRIPE_PRICE_INVESTOR_MONTHLY?.trim() ?? '';
}

export function stripePriceInvestorYearly(): string {
  return (
    process.env.STRIPE_PRICE_INVESTOR_YEARLY?.trim() ||
    process.env.STRIPE_PRICE_INVESTOR_MONTHLY?.trim() ||
    ''
  );
}

export function frontendBaseUrl(): string {
  const u =
    process.env.FRONTEND_URL?.trim() ||
    process.env.WEB_APP_URL?.trim() ||
    'http://localhost:3000';
  return u.replace(/\/$/, '');
}

export function planFromStripePriceId(
  priceId: string
): 'pro' | 'investor' | null {
  if (!priceId) return null;
  if (
    priceId === stripePriceProMonthly() ||
    priceId === stripePriceProYearly()
  ) {
    return 'pro';
  }
  if (
    priceId === stripePriceInvestorMonthly() ||
    priceId === stripePriceInvestorYearly()
  ) {
    return 'investor';
  }
  return null;
}
