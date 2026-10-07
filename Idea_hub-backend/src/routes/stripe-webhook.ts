import type { Request, Response } from 'express';

import { handleStripeWebhookRaw } from '../services/stripe-billing.service.js';

export async function stripeWebhookRoute(
  req: Request,
  res: Response
): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).send('Expected raw body');
    return;
  }
  const result = await handleStripeWebhookRaw(
    raw,
    typeof sig === 'string' ? sig : undefined
  );
  if ('error' in result && result.error) {
    res.status(400).send(result.error);
    return;
  }
  res.json({ received: true });
}
