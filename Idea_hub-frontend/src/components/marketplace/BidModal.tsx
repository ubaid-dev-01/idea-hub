'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { PortalModal } from '@/components/gamification/PortalModal';
import { Button } from '@/components/ui/Button';
import { marketplaceApi } from '@/lib/api/marketplace.api';

export function BidModal({
  open,
  onClose,
  listingId,
  suggestedMin,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  suggestedMin?: number;
  onSuccess?: () => void;
}) {
  const [amount, setAmount] = useState(
    suggestedMin && suggestedMin > 0 ? String(suggestedMin) : ''
  );
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid offer amount');
      return;
    }
    if (!terms) {
      toast.error('Accept the terms to continue');
      return;
    }
    setLoading(true);
    try {
      await marketplaceApi.submitBid(listingId, n, message.trim());
      toast.success('Offer submitted — the seller has been notified');
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalModal open={open} onClose={onClose} title="Make an offer">
      <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
        <p>
          Your offer is not binding until the seller accepts. The platform
          applies a <strong>15% commission</strong> on completed sales (from the
          sale price; payout net to seller is shown after acceptance).
        </p>
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            Offer (USD)
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input mt-1 w-full"
            placeholder="5000"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            Message to seller
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input mt-1 min-h-[100px] w-full resize-y"
            placeholder="Introduce yourself and your plans…"
            maxLength={2000}
          />
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I understand this is an expression of interest / offer and does not
            transfer rights until a formal agreement is completed on the platform.
          </span>
        </label>
        <Button
          type="button"
          className="w-full"
          loading={loading}
          onClick={() => void submit()}
        >
          Submit offer
        </Button>
      </div>
    </PortalModal>
  );
}
