import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/landing/LegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy | Idea Hub',
  description: 'How Idea Hub collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="April 6, 2026"
      currentPage="privacy"
      heroDescription="How we collect, use, and protect information when you use Idea Hub — written to be readable, not buried in legalese."
    >
      <p>
        This Privacy Policy describes how Idea Hub (“we,” “us,” or “our”) collects, uses, stores, and
        shares information when you use our website, applications, and related services (collectively, the
        “Services”). By using the Services, you agree to this policy. If you do not agree, please
        discontinue use.
      </p>
      <p>
        Idea Hub is a social product: much of what you choose to publish is visible to other members
        according to your settings. This policy explains both community-facing data and account data that
        stays operational (security, billing, support).
      </p>

      <div className="not-prose my-8 border-y border-[var(--lh-line)] py-6 text-sm leading-relaxed text-[var(--lh-muted)]">
        <p className="font-semibold text-[var(--lh-ink)]">Privacy inquiries</p>
        <p className="mt-1">
          For privacy-specific questions, data requests, or regulatory correspondence:{' '}
          <a
            href="mailto:privacy@ideahub.com"
            className="font-medium text-[var(--lh-ink)] underline underline-offset-4"
          >
            privacy@ideahub.com
          </a>
        </p>
      </div>

      <h2>1. Information we collect</h2>
      <h3>1.1 You provide directly</h3>
      <ul>
        <li>
          <strong>Account data:</strong> name, username, email address, password (stored using
          industry-standard hashing—we never store your password in plain text), profile bio, avatar,
          skills, and optional verification materials if you apply for badges.
        </li>
        <li>
          <strong>Content:</strong> ideas, comments, messages, collaboration requests, marketplace
          listings, media uploads, and other material you submit.
        </li>
        <li>
          <strong>Payments (if enabled):</strong> billing details are processed by our payment provider
          (e.g., Stripe). We do not store full card numbers on our servers.
        </li>
        <li>
          <strong>Support:</strong> when you email us or use in-app help, we keep tickets and attachments
          long enough to resolve the issue and meet legal retention where applicable.
        </li>
      </ul>

      <h3>1.2 Collected automatically</h3>
      <ul>
        <li>
          <strong>Usage and device data:</strong> IP address, browser type, device identifiers, approximate
          location derived from IP, pages viewed, timestamps, and in-app events (e.g., idea views, likes) to
          operate features, secure the platform, and improve performance.
        </li>
        <li>
          <strong>Diagnostics:</strong> crash logs and performance metrics to fix bugs and measure
          reliability, typically aggregated or pseudonymized where feasible.
        </li>
        <li>
          <strong>Cookies and similar technologies:</strong> see Section 4.
        </li>
      </ul>

      <h3>1.3 From others</h3>
      <p>
        If another user mentions you, tags your content, or imports contact information through integrations
        we may offer, we may receive related data subject to their settings and this policy.
      </p>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, maintain, and improve the Services (feeds, search, notifications, AI features).</li>
        <li>Authenticate you, prevent fraud, enforce our Terms, and protect users.</li>
        <li>
          Send transactional emails (security alerts, password resets) and, where permitted, product
          updates you can opt out of.
        </li>
        <li>Analyze aggregated usage to understand feature adoption and reliability.</li>
        <li>Train safety and ranking systems consistent with your settings and applicable law.</li>
        <li>Comply with legal obligations and respond to lawful requests.</li>
      </ul>

      <h2>3. How we share information</h2>
      <ul>
        <li>
          <strong>Public profile and content:</strong> information you set to public (e.g., published ideas,
          public profile fields) is visible to other users and may be indexed by search engines according to
          your settings.
        </li>
        <li>
          <strong>Service providers:</strong> hosting, analytics, email delivery, payment processing, and
          security vendors who process data on our instructions under contractual safeguards.
        </li>
        <li>
          <strong>Legal:</strong> when required by law, court order, or to protect rights, safety, and
          integrity of Idea Hub and our users.
        </li>
        <li>
          <strong>Business transfers:</strong> in a merger, acquisition, or asset sale, your information may
          transfer subject to appropriate notice and continued protection.
        </li>
      </ul>
      <p>
        We do not sell your personal information for money as traditionally defined. Where “sharing” for
        targeted advertising applies in your jurisdiction, we provide opt-out paths described in product
        settings and this policy.
      </p>

      <h2>4. Cookies and similar technologies</h2>
      <p>
        We use cookies, local storage, and SDKs where relevant for session management, preferences (including
        theme), security (e.g., CSRF protection), analytics, and experimentation. Categories include:
      </p>
      <ul>
        <li>
          <strong>Strictly necessary:</strong> login sessions, load balancing, abuse prevention—cannot be
          disabled without breaking core functionality.
        </li>
        <li>
          <strong>Functional:</strong> remembers UI choices such as language or layout where offered.
        </li>
        <li>
          <strong>Analytics:</strong> helps us understand which flows fail or succeed, often in aggregate.
        </li>
      </ul>
      <p>
        You can control cookies through your browser; disabling essential cookies may break login or
        security features. For third-party embeds (e.g., video players), their policies also apply.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain information as long as your account is active or as needed to provide the Services, comply
        with law, resolve disputes, and enforce agreements. You may delete certain content or your account
        where the product supports it; residual copies may persist in backups for a limited period. Some
        logs are retained longer for security investigations.
      </p>

      <h2>6. Security</h2>
      <p>
        We use administrative, technical, and organizational measures designed to protect data. No method
        of transmission over the Internet is 100% secure; we encourage strong passwords and enabling any
        additional security options we provide.
      </p>

      <h2>7. International transfers</h2>
      <p>
        If you access the Services from outside the country where our servers operate, your data may be
        processed in jurisdictions with different data protection laws. Where required, we use appropriate
        safeguards (such as standard contractual clauses).
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or export your personal
        data; object to or restrict certain processing; and withdraw consent where processing is
        consent-based. To exercise rights, contact us through in-app settings or email{' '}
        <a href="mailto:privacy@ideahub.com">privacy@ideahub.com</a>. You may lodge a complaint with your
        local supervisory authority.
      </p>
      <p>
        If you need a record of processing for your employer (DPA), contact us with your company details. We
        provide standard terms for business customers.
      </p>

      <h2>9. Children</h2>
      <p>
        The Services are not directed to children under the age required by applicable law (often 13 or 16).
        We do not knowingly collect personal information from children. If you believe we have, contact us
        and we will delete it promptly.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised policy with a new
        “Last updated” date and, where appropriate, notify you by email or in-product notice.
      </p>

      <h2>11. Contact</h2>
      <p>
        For privacy-specific questions, requests to exercise rights, or complaints related to this policy,
        email <a href="mailto:privacy@ideahub.com">privacy@ideahub.com</a>. For general support, see the{' '}
        <Link href="/contact">Contact</Link> page. For rules of use, see our{' '}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalDocument>
  );
}
