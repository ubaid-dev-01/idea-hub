import { cn } from '@/components/ui/cn';

type IdeaHubLogoProps = {
  className?: string;
  withWordmark?: boolean;
  size?: number;
  inverted?: boolean;
};

/**
 * Idea Hub mark — “Folio”
 *
 * Research notes (why this, not Orbit / IH bars):
 * - Early SaaS should use a combination mark; the symbol must mean something
 *   on day one (not abstract orbits that need prior recognition).
 * - Category clichés to avoid: lightbulbs, node networks, orbital dots,
 *   generic initial bars — all read as “AI logo generator” output.
 * - Product truth: Idea Hub is a place where idea posts stack, get validated,
 *   and move forward. Two offset cards = a hub of ideas — readable at 16px.
 */
export function IdeaHubMark({
  className,
  size = 32,
  inverted = false,
}: {
  className?: string;
  size?: number;
  inverted?: boolean;
}) {
  const bg = inverted ? '#F5F5F3' : '#0A0A0A';
  const back = '#0F766E';
  const front = inverted ? '#0A0A0A' : '#FAFAF9';
  const line = inverted ? '#F5F5F3' : '#0A0A0A';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="48" height="48" rx="10" fill={bg} />

      {/* Back card — hub / depth */}
      <rect x="16" y="10" width="20" height="26" rx="3.5" fill={back} />

      {/* Front card — the active idea */}
      <rect x="12" y="14" width="20" height="26" rx="3.5" fill={front} />

      {/* Title rule — suggests a written idea, not a decoration */}
      <rect x="16" y="20" width="12" height="2.25" rx="1.1" fill={line} opacity={0.9} />
      <rect x="16" y="25" width="8" height="2.25" rx="1.1" fill={line} opacity={0.35} />
    </svg>
  );
}

export function IdeaHubLogo({
  className,
  withWordmark = true,
  size = 32,
  inverted = false,
}: IdeaHubLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <IdeaHubMark size={size} inverted={inverted} />
      {withWordmark ? (
        <span
          className={cn(
            'landing-display text-[1.15rem] font-semibold tracking-tight',
            inverted ? 'text-white' : 'text-[var(--lh-ink)]'
          )}
        >
          Idea Hub
        </span>
      ) : null}
    </span>
  );
}
