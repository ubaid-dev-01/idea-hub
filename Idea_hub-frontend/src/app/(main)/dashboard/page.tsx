'use client';

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Eye,
  Handshake,
  Heart,
  LayoutGrid,
  Lightbulb,
  MessageCircle,
  Plus,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';
import { extractApiError } from '@/lib/api/errors';
import { usersApi } from '@/lib/api/users.api';
import { getEffectivePlan } from '@/lib/subscription';
import { useAuthStore } from '@/store/authStore';

function firstName(fullName: string): string {
  const p = fullName.trim().split(/\s+/)[0];
  return p ?? fullName;
}

export default function UserDashboardPage() {
  return (
    <AuthGuard>
      <UserDashboardInner />
    </AuthGuard>
  );
}

function UserDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ['users', 'me', 'dashboard'],
    queryFn: () => usersApi.getMyDashboard(),
  });

  if (q.isLoading || !user) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-3 py-6 md:px-6">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          {extractApiError(q.error)}
        </p>
        <Button className="mt-4" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const d = q.data;
  const profile = d.profile;
  const effPlan = getEffectivePlan(profile);
  const barData = d.weeklyViews.map((row) => ({
    ...row,
    label: format(parseISO(`${row.date}T12:00:00.000Z`), 'EEE'),
  }));
  const gm = profile.gamification;

  const profileScore =
    (profile.avatarUrl ? 1 : 0) +
    (profile.bio?.trim() ? 1 : 0) +
    (profile.skills?.length ? 1 : 0);
  const profilePct = Math.round((profileScore / 3) * 100);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-3 py-6 md:px-6 md:py-10">
      {/* Hero */}
      <section className="border-b border-[var(--lh-line)] pb-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[var(--lh-line)] bg-[var(--lh-surface)]">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[var(--lh-ink)]">
                  {profile.fullName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="landing-eyebrow">Your overview</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="landing-display text-2xl font-semibold tracking-tight text-[var(--lh-ink)] md:text-3xl">
                  Welcome back, {firstName(profile.fullName)}
                </h1>
                {gm ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lh-line)] px-2.5 py-0.5 text-xs font-medium text-[var(--lh-muted)]">
                    <Trophy className="h-3.5 w-3.5 text-[var(--lh-accent)]" />
                    Lv.{gm.level} {gm.levelTitle}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--lh-muted)]">
                @{profile.username}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={cn(
                    'rounded-full border border-[var(--lh-line)] px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[var(--lh-ink)]'
                  )}
                >
                  {effPlan} plan
                </span>
                {profile.verifiedInnovator ? (
                  <span className="rounded-full bg-[var(--lh-accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--lh-accent)]">
                    Verified innovator
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Button asChild className="justify-center">
              <Link href="/ideas/new">
                <Plus className="h-4 w-4" />
                New idea
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-center">
              <Link href="/my-ideas">
                <Lightbulb className="h-4 w-4" />
                My ideas
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPI row — all API stats */}
      <section aria-label="Your stats">
        <h2 className="landing-eyebrow mb-5">Performance</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat icon={Lightbulb} label="Ideas" value={d.stats.totalIdeas} />
          <MiniStat icon={Heart} label="Likes received" value={d.stats.totalLikes} />
          <MiniStat icon={Eye} label="Views" value={d.stats.totalViews} />
          <MiniStat icon={MessageCircle} label="Comments" value={d.stats.totalComments} />
          <MiniStat icon={Handshake} label="Collabs on ideas" value={d.stats.totalCollaborators} />
          <MiniStat icon={Users} label="Followers" value={d.stats.totalFollowers} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
                  Idea pipeline
                </h2>
                <p className="mt-0.5 text-xs text-[var(--lh-muted)]">
                  Status counts for ideas you own
                </p>
              </div>
              <Link
                href="/my-ideas"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--lh-accent)] hover:underline"
              >
                Manage
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatusPill label="Published" value={d.ideas.published} ok />
              <StatusPill label="Pending" value={d.ideas.pending} warn />
              <StatusPill label="Draft" value={d.ideas.draft} />
              <StatusPill label="Rejected" value={d.ideas.rejected} danger />
            </div>
          </section>

          <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
                  Weekly views
                </h2>
                <p className="mt-0.5 text-xs text-[var(--lh-muted)]">
                  Unique view events on your ideas · last 7 days
                </p>
              </div>
              <TrendingUp className="h-5 w-5 text-[var(--lh-muted)] opacity-50" />
            </div>
            <div className="h-56 w-full md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke="var(--lh-line)"
                    opacity={0.7}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--lh-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--lh-muted)' }}
                    width={36}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--lh-accent-soft)' }}
                    contentStyle={{
                      borderRadius: 0,
                      fontSize: 12,
                      border: '1px solid var(--lh-line)',
                      background: 'var(--lh-bg)',
                      color: 'var(--lh-ink)',
                    }}
                  />
                  <Bar
                    dataKey="views"
                    fill="var(--lh-accent)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {d.ideas.topIdea ? (
            <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
              <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
                Top performing idea
              </h2>
              <p className="mt-0.5 text-xs text-[var(--lh-muted)]">
                Highest engagement among your published ideas
              </p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-full shrink-0 overflow-hidden border border-[var(--lh-line)] bg-[var(--lh-surface)] sm:h-28 sm:w-36">
                  {d.ideas.topIdea.media?.[0]?.thumbnailUrl ||
                  d.ideas.topIdea.media?.[0]?.cdnUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        d.ideas.topIdea.media[0].thumbnailUrl ||
                        d.ideas.topIdea.media[0].cdnUrl ||
                        ''
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--lh-muted)]">
                      <Lightbulb className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--lh-ink)]">
                    {d.ideas.topIdea.title}
                  </p>
                  <p className="text-xs text-[var(--lh-muted)]">
                    {d.ideas.topIdea.category} · {d.ideas.topIdea.status}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--lh-ink-soft)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-[var(--lh-muted)]" />{' '}
                      {d.ideas.topIdea.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-[var(--lh-muted)]" />{' '}
                      {d.ideas.topIdea.viewCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4 text-[var(--lh-muted)]" />{' '}
                      {d.ideas.topIdea.commentCount}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--lh-muted)]">
                      <span>Validation score</span>
                      <span className="font-medium tabular-nums text-[var(--lh-ink)]">
                        {Math.round(
                          Number(d.ideas.topIdea.contentScanScore ?? 0) * 100
                        )}
                        /100
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full max-w-md overflow-hidden bg-[var(--lh-line)]">
                      <div
                        className="h-full bg-[var(--lh-accent)] transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              Number(d.ideas.topIdea.contentScanScore ?? 0) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/ideas/${d.ideas.topIdea._id}`}>
                        View idea
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/my-ideas">Edit in My ideas</Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/ideas/${d.ideas.topIdea._id}`}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="border border-dashed border-[var(--lh-line)] bg-[var(--lh-surface)] p-8 text-center">
              <Lightbulb className="mx-auto h-10 w-10 text-[var(--lh-muted)] opacity-50" />
              <p className="mt-3 font-medium text-[var(--lh-ink)]">
                No published ideas yet
              </p>
              <p className="mt-1 text-sm text-[var(--lh-muted)]">
                Publish your first idea to see performance and validation scores
                here.
              </p>
              <Button asChild className="mt-4">
                <Link href="/ideas/new">
                  <Plus className="h-4 w-4" />
                  Create an idea
                </Link>
              </Button>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
            <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              Shortcuts
            </h2>
            <p className="mt-0.5 text-xs text-[var(--lh-muted)]">
              Jump to key areas
            </p>
            <ul className="mt-4 divide-y divide-[var(--lh-line)]">
              <Shortcut href="/feed" icon={LayoutGrid} label="Feed" />
              <Shortcut href="/marketplace" icon={ShoppingBag} label="Marketplace" />
              <Shortcut href="/collaborations" icon={Handshake} label="Collaborations" />
              <Shortcut href="/saved" icon={Bookmark} label="Saved" />
              <Shortcut href="/notifications" icon={Bell} label="Notifications" />
              <Shortcut href="/leaderboard" icon={Trophy} label="Leaderboard" />
              <Shortcut href="/account/settings" icon={Settings} label="Account settings" />
              <Shortcut href="/pricing" icon={Sparkles} label="Plans & pricing" />
            </ul>
          </section>

          <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
            <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              Profile
            </h2>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-[var(--lh-muted)]">
                <span>Profile strength</span>
                <span className="font-semibold text-[var(--lh-ink)]">
                  {profilePct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden bg-[var(--lh-line)]">
                <div
                  className="h-full bg-[var(--lh-accent)]"
                  style={{ width: `${profilePct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--lh-muted)]">
                {!profile.avatarUrl && 'Add an avatar. '}
                {!profile.bio?.trim() && 'Write a short bio. '}
                {!profile.skills?.length && 'Add skills. '}
                {profileScore === 3 && 'Profile looks complete.'}
              </p>
              <Link
                href="/account/settings"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lh-accent)] hover:underline"
              >
                <Settings className="h-4 w-4" />
                Edit profile
              </Link>
            </div>
          </section>

          <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
            <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              Subscription
            </h2>
            <p className="mt-2 landing-display text-2xl font-semibold capitalize text-[var(--lh-ink)]">
              {effPlan}
            </p>
            {effPlan === 'free' ? (
              <p className="mt-1 text-sm text-[var(--lh-muted)]">
                Upgrade for unlimited ideas, marketplace listings, and more.
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--lh-muted)]">
                {profile.subscription?.currentPeriodEnd ? (
                  <>
                    Renews{' '}
                    {format(
                      parseISO(profile.subscription.currentPeriodEnd),
                      'MMM d, yyyy'
                    )}{' '}
                    (
                    {formatDistanceToNow(
                      parseISO(profile.subscription.currentPeriodEnd),
                      { addSuffix: true }
                    )}
                    )
                  </>
                ) : (
                  'Active subscription'
                )}
              </p>
            )}
            <Button asChild variant="secondary" className="mt-4 w-full" size="sm">
              <Link href="/pricing">View plans</Link>
            </Button>
          </section>
        </aside>
      </div>

      {/* Activity + collabs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              Recent activity
            </h2>
            <Link
              href="/notifications"
              className="text-xs font-medium text-[var(--lh-accent)] hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="space-y-0 divide-y divide-[var(--lh-line)]">
            {d.recentActivity.length === 0 ? (
              <li className="py-8 text-center text-sm text-[var(--lh-muted)]">
                No likes, comments, or follows yet. Keep publishing!
              </li>
            ) : (
              d.recentActivity.slice(0, 8).map((a, i) => (
                <li key={`${a.type}-${i}-${a.createdAt}`} className="flex gap-3 py-3 first:pt-0">
                  <ActivityIcon type={a.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--lh-ink)]">
                      <span className="font-medium">
                        @
                        {typeof a.from === 'object' ? a.from.username : 'user'}
                      </span>{' '}
                      {a.type === 'like' && 'liked'}
                      {a.type === 'comment' && 'commented on'}
                      {a.type === 'collab' && 'sent a collaboration request for'}
                      {a.type === 'follow' && 'started following you'}
                      {a.idea
                        ? ` “${a.idea.title.slice(0, 48)}${a.idea.title.length > 48 ? '…' : ''}”`
                        : ''}
                    </p>
                    <p className="text-xs text-[var(--lh-muted)]">
                      {format(new Date(a.createdAt), 'MMM d · h:mm a')}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-[var(--lh-line)] bg-[var(--lh-bg)] p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              Collaborations
            </h2>
            <Link
              href="/collaborations"
              className="text-xs font-medium text-[var(--lh-accent)] hover:underline"
            >
              Open hub
            </Link>
          </div>
          {d.collaborations.length === 0 ? (
            <p className="py-4 text-sm text-[var(--lh-muted)]">
              No accepted collaborations yet. Send requests from idea pages or
              explore the community.
            </p>
          ) : (
            <ul className="space-y-2">
              {d.collaborations.slice(0, 6).map((c) => (
                <li key={c.idea._id}>
                  <Link
                    href={`/ideas/${c.idea._id}`}
                    className="font-medium text-[var(--lh-ink)] hover:text-[var(--lh-accent)] hover:underline"
                  >
                    {c.idea.title}
                  </Link>
                  <span className="text-xs text-[var(--lh-muted)]">
                    {' '}
                    · {c.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.pendingCollabRequests.length > 0 ? (
            <div className="mt-4 border-t border-[var(--lh-line)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lh-muted)]">
                Pending outgoing
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {d.pendingCollabRequests.slice(0, 5).map((p) => (
                  <li key={p.idea._id + p.createdAt}>
                    <span className="text-[var(--lh-ink)]">
                      {p.idea.title}
                    </span>{' '}
                    <span className="text-[var(--lh-muted)]">
                      ({p.status})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Shortcut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Lightbulb;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-1 py-2.5 text-sm text-[var(--lh-ink)] transition-colors hover:text-[var(--lh-accent)]"
      >
        <span className="flex h-8 w-8 items-center justify-center text-[var(--lh-muted)]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-medium">{label}</span>
        <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 opacity-30" />
      </Link>
    </li>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const wrap =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--lh-line)] bg-[var(--lh-surface)] text-[var(--lh-accent)]';
  if (type === 'like')
    return (
      <div className={wrap}>
        <Heart className="h-3.5 w-3.5" />
      </div>
    );
  if (type === 'comment')
    return (
      <div className={wrap}>
        <MessageCircle className="h-3.5 w-3.5" />
      </div>
    );
  if (type === 'collab')
    return (
      <div className={wrap}>
        <Handshake className="h-3.5 w-3.5" />
      </div>
    );
  return (
    <div className={wrap}>
      <Users className="h-3.5 w-3.5" />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Lightbulb;
  label: string;
  value: number;
}) {
  return (
    <div className="border-t border-[var(--lh-line)] pt-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="landing-display text-2xl font-semibold tabular-nums tracking-tight text-[var(--lh-ink)] sm:text-3xl">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--lh-muted)]">{label}</p>
        </div>
        <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--lh-muted)] opacity-60" />
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  ok,
  warn,
  danger,
}: {
  label: string;
  value: number;
  ok?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="border border-[var(--lh-line)] bg-[var(--lh-surface)] px-3 py-3 text-center">
      <div
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide text-[var(--lh-muted)]',
          ok && 'text-[var(--lh-accent)]',
          warn && 'text-amber-700 dark:text-amber-400',
          danger && 'text-red-600 dark:text-red-400'
        )}
      >
        {label}
      </div>
      <div className="mt-1 landing-display text-xl font-semibold tabular-nums text-[var(--lh-ink)]">
        {value}
      </div>
    </div>
  );
}
