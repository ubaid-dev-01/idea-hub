import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/landing/LegalDocument';

export const metadata: Metadata = {
  title: 'Terms of Service | Idea Hub',
  description: 'Terms of use for Idea Hub: conduct, intellectual property, and account policies.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="April 6, 2026"
      currentPage="terms"
      heroDescription="The rules that keep Idea Hub safe for builders: what you can expect from us, and what we expect from you."
    >
      <p>
        These Terms of Service (“Terms”) govern your access to and use of Idea Hub’s Services. By creating
        an account or using the Services, you agree to these Terms. If you are using Idea Hub on behalf of an
        organization, you represent that you have authority to bind that organization.
      </p>
      <p>
        The Services evolve: we may add or refine features. When we make material changes to these Terms,
        we will give you reasonable notice as described in Section 13. Your continued use after the
        effective date means you accept the updated Terms unless applicable law requires otherwise.
      </p>

      <h2>1. The Services</h2>
      <p>
        Idea Hub provides a social platform for sharing ideas, collaborating, messaging, and related
        features that may change over time. We may modify, suspend, or discontinue features with reasonable
        notice where practicable. We do not guarantee any particular outcome (e.g., funding, partnerships,
        or distribution) from content you post.
      </p>

      <h2>2. Accounts and security</h2>
      <ul>
        <li>You must provide accurate registration information and keep it current.</li>
        <li>
          You are responsible for activity under your account. Notify us immediately of unauthorized use via{' '}
          <a href="mailto:security@ideahub.com">security@ideahub.com</a> or in-app channels.
        </li>
        <li>
          We may require verification for certain features (e.g., marketplace, badges) to reduce fraud and
          abuse.
        </li>
        <li>
          You must be old enough to enter a binding contract in your jurisdiction and meet any minimum age in
          our <Link href="/privacy">Privacy Policy</Link>.
        </li>
      </ul>

      <h2>3. Acceptable use and conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Harass, threaten, defame, or discriminate against others; post hate speech or extremist content.</li>
        <li>
          Share illegal content, instructions for wrongdoing, or non-consensual intimate imagery.
        </li>
        <li>
          Spam, scrape, or use automated means to access the Services in violation of our rules or
          robots.txt.
        </li>
        <li>
          Impersonate any person or entity, or misrepresent your affiliation with Idea Hub or third parties.
        </li>
        <li>
          Attempt to probe, scan, or test vulnerabilities without authorization; interfere with
          infrastructure or other users’ experience.
        </li>
        <li>
          Circumvent paywalls, rate limits, or technical restrictions; reverse engineer except where law
          permits.
        </li>
        <li>
          Post content you do not have rights to share, or misrepresent the originality of ideas in a way
          that could mislead collaborators or investors.
        </li>
      </ul>
      <p>
        We may remove content, suspend, or terminate accounts that violate these rules or pose risk to the
        community. Enforcement may be automated or manual; serious violations may be reported to authorities
        where required.
      </p>

      <h2>4. Your content and license to us</h2>
      <p>
        You retain ownership of intellectual property rights in content you submit (“Your Content”). To
        operate the Services, you grant Idea Hub a worldwide, non-exclusive, royalty-free license to host,
        store, reproduce, modify (e.g., transcoding media), display, distribute, and create derivative works
        solely as needed to run, promote, and improve the Services—including showing Your Content to users
        you authorize and training safety systems where permitted by law and our product settings.
      </p>
      <p>
        You represent that you have the rights to grant the above license and that Your Content does not
        infringe third-party rights. You may delete certain content subject to retention for legal,
        security, or backup purposes as described in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>5. Idea Hub intellectual property</h2>
      <p>
        The Idea Hub name, logo, UI, and software are protected by intellectual property laws. Except for the
        limited rights expressly granted, these Terms do not grant you any rights in our property. Feedback
        you provide may be used by us without obligation to you.
      </p>

      <h2>6. Third-party links and integrations</h2>
      <p>
        The Services may link to third-party sites or integrate third-party tools. We are not responsible
        for their content or practices; their terms and privacy policies apply.
      </p>

      <h2>7. Subscriptions and payments</h2>
      <p>
        Paid plans, if offered, are billed according to the pricing page and checkout flow. Fees are
        non-refundable except where required by law or stated otherwise. You may cancel according to
        in-product billing settings; access may continue until the end of the paid period. Taxes may apply
        based on your location.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
        DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS
        FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE
        UNINTERRUPTED OR ERROR-FREE OR THAT CONTENT WILL BE ACCURATE OR RELIABLE.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IDEA HUB AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS
        WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
        LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES. OUR AGGREGATE LIABILITY
        FOR CLAIMS RELATING TO THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE
        TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (IF YOU HAVE NOT PAID US).
      </p>

      <h2>10. Indemnity</h2>
      <p>
        You will defend and indemnify Idea Hub against claims, damages, losses, and expenses (including
        reasonable attorneys’ fees) arising from Your Content, your use of the Services, or your violation of
        these Terms or law, except to the extent caused by our willful misconduct.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the Services at any time and delete your account where the product allows. We may
        suspend or terminate your access for breach of these Terms, risk to users or infrastructure, or
        extended inactivity as disclosed in product policies. Provisions that by nature should survive
        (e.g., licenses to the extent needed to retain archival copies, disclaimers, limitations, indemnity)
        will survive termination.
      </p>

      <h2>12. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States, without regard to
        conflict-of-law rules, except where consumer protection law in your country of residence requires
        otherwise. Courts in San Francisco County, California (or another venue we designate for corporate
        defendants) have exclusive venue for business users, except where mandatory arbitration or local
        consumer rules apply.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms. We will post the new Terms with an updated date and, for material
        changes, provide reasonable notice (e.g., email or in-app). Continued use after the effective date
        constitutes acceptance. If you disagree, you must stop using the Services.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms: <a href="mailto:legal@ideahub.com">legal@ideahub.com</a>. General
        product support: see <Link href="/contact">Contact</Link>. Privacy rights:{' '}
        <a href="mailto:privacy@ideahub.com">privacy@ideahub.com</a>. Company background:{' '}
        <Link href="/about">About Idea Hub</Link>.
      </p>
    </LegalDocument>
  );
}
