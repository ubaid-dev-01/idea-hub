'use client';

import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  FolderKanban,
  Lightbulb,
  MessageSquareWarning,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { StatCard } from '@/components/dashboard/StatCard';
import { cn } from '@/components/ui/cn';
import type { AdminDashboardStats, IIdea, IUser } from '@/types/api';

/** Landing-aligned category palette (teal / ink family) */
const CATEGORY_COLORS: Record<string, string> = {
  tech: '#0F766E',
  health: '#0D9488',
  education: '#115E59',
  environment: '#14B8A6',
  finance: '#134E4A',
  social: '#5EEAD4',
  art: '#2DD4BF',
  other: '#737373',
};

const TEAL = '#0F766E';
const INK = '#262626';

function safeDayLabel(dateStr: string): string {
  try {
    return format(parseISO(`${dateStr}T12:00:00.000Z`), 'EEE');
  } catch {
    return '—';
  }
}

function buildLineSeries(
  weeklyActivity: AdminDashboardStats['weeklyActivity']
): Array<{ date: string; users: number; ideas: number; label: string }> {
  const rows = Array.isArray(weeklyActivity) ? weeklyActivity : [];
  return rows.map((d) => ({
    date: d.date,
    users: Math.max(0, Number(d.users) || 0),
    ideas: Math.max(0, Number(d.ideas) || 0),
    label: safeDayLabel(d.date),
  }));
}

function authorLabel(idea: IIdea): string {
  const a = idea.authorId;
  if (a && typeof a === 'object' && 'username' in a) {
    return `@${(a as IUser).username}`;
  }
  return '';
}

function defaultStats(): AdminDashboardStats {
  return {
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalIdeas: 0,
      publishedIdeas: 0,
      totalLikes: 0,
      totalCollabs: 0,
    },
    trends: {
      usersPct: 0,
      ideasPct: 0,
      signupsTodayPct: 0,
      queuePct: 0,
    },
    today: {
      newUsers: 0,
      newIdeas: 0,
      newLikes: 0,
      scanJobsRan: 0,
    },
    scanQueue: {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      avgScore: 0,
    },
    topIdeas: [],
    recentUsers: [],
    categoryBreakdown: {},
    weeklyActivity: [],
    legacy: {
      dau: 0,
      mau: 0,
      ideasTrend: [],
      categoryDistribution: [],
      engagementBuckets: [],
      rejectionRate: 0,
    },
    kpis: {
      totalIdeas: 0,
      activeProjects: 0,
      totalUsers: 0,
      publishedIdeas: 0,
    },
    ideasTrend6Months: [],
    ideasByStatus: {},
    monthlyGrowth: { ideasPct: 0, usersPct: 0 },
    recentIdeasFeed: [],
    topContributors: [],
    pendingApprovals: [],
    comments: { total: 0, flagged: 0 },
  };
}

function normalizeAdminStats(
  stats: AdminDashboardStats | Partial<AdminDashboardStats> | null | undefined
): AdminDashboardStats {
  const d = defaultStats();
  if (!stats || typeof stats !== 'object') {
    return d;
  }
  const overview = { ...d.overview, ...(stats.overview ?? {}) };
  const trends = { ...d.trends, ...(stats.trends ?? {}) };
  const today = { ...d.today, ...(stats.today ?? {}) };
  const scanQueue = { ...d.scanQueue, ...(stats.scanQueue ?? {}) };
  const legacy = { ...d.legacy, ...(stats.legacy ?? {}) };

  /**
   * Prefer `kpis` when the API sends it; otherwise derive from `overview` so older
   * servers (or responses without `kpis`) still show real counts.
   */
  const kpis = {
    totalIdeas:
      typeof stats.kpis?.totalIdeas === 'number'
        ? stats.kpis.totalIdeas
        : overview.totalIdeas,
    activeProjects:
      typeof stats.kpis?.activeProjects === 'number'
        ? stats.kpis.activeProjects
        : overview.totalCollabs,
    totalUsers:
      typeof stats.kpis?.totalUsers === 'number'
        ? stats.kpis.totalUsers
        : overview.totalUsers,
    publishedIdeas:
      typeof stats.kpis?.publishedIdeas === 'number'
        ? stats.kpis.publishedIdeas
        : overview.publishedIdeas,
  };

  let ideasTrend6Months = Array.isArray(stats.ideasTrend6Months)
    ? stats.ideasTrend6Months
    : d.ideasTrend6Months;
  if (
    (!ideasTrend6Months || ideasTrend6Months.length === 0) &&
    Array.isArray(legacy.ideasTrend) &&
    legacy.ideasTrend.length > 0
  ) {
    ideasTrend6Months = legacy.ideasTrend.slice(-6).map((row) => ({
      label: row.label,
      value: row.value,
    }));
  }
  const ideasByStatus =
    stats.ideasByStatus &&
    typeof stats.ideasByStatus === 'object' &&
    !Array.isArray(stats.ideasByStatus)
      ? stats.ideasByStatus
      : d.ideasByStatus;
  const monthlyGrowth = { ...d.monthlyGrowth, ...(stats.monthlyGrowth ?? {}) };
  const recentIdeasFeed = Array.isArray(stats.recentIdeasFeed)
    ? stats.recentIdeasFeed
    : d.recentIdeasFeed;
  const topContributors = Array.isArray(stats.topContributors)
    ? stats.topContributors
    : d.topContributors;
  const pendingApprovals = Array.isArray(stats.pendingApprovals)
    ? stats.pendingApprovals
    : d.pendingApprovals;
  const comments = {
    ...d.comments,
    ...(stats.comments && typeof stats.comments === 'object'
      ? stats.comments
      : {}),
  };

  const weeklyActivity = Array.isArray(stats.weeklyActivity)
    ? stats.weeklyActivity
    : d.weeklyActivity;
  const topIdeas = Array.isArray(stats.topIdeas) ? stats.topIdeas : d.topIdeas;
  const recentUsers = Array.isArray(stats.recentUsers)
    ? stats.recentUsers
    : d.recentUsers;
  const categoryBreakdown =
    stats.categoryBreakdown &&
    typeof stats.categoryBreakdown === 'object' &&
    !Array.isArray(stats.categoryBreakdown)
      ? stats.categoryBreakdown
      : d.categoryBreakdown;

  return {
    overview,
    trends,
    today,
    scanQueue,
    topIdeas,
    recentUsers,
    categoryBreakdown,
    weeklyActivity,
    legacy,
    kpis,
    ideasTrend6Months,
    ideasByStatus,
    monthlyGrowth,
    recentIdeasFeed,
    topContributors,
    pendingApprovals,
    comments,
  };
}

export function AdminDashboardCharts({
  stats,
}: {
  stats: AdminDashboardStats | Partial<AdminDashboardStats> | null | undefined;
}) {
  const {
    overview,
    trends,
    today,
    scanQueue,
    topIdeas,
    recentUsers,
    categoryBreakdown,
    weeklyActivity,
    legacy,
    kpis,
    ideasTrend6Months,
    ideasByStatus,
    monthlyGrowth,
    recentIdeasFeed,
    topContributors,
    pendingApprovals,
    comments,
  } = normalizeAdminStats(stats);

  const lineData = buildLineSeries(weeklyActivity);

  const lineMax = Math.max(
    1,
    ...lineData.flatMap((d) => [d.users, d.ideas])
  );
  const yAxisMax = Math.max(5, Math.ceil(lineMax * 1.15));

  const donutData = Object.entries(categoryBreakdown ?? {})
    .map(([name, value]) => ({
      name,
      value,
      fill: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.other,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  const trend6Data = ideasTrend6Months.map((d) => ({
    label: d.label,
    ideas: d.value,
  }));
  const trend6Max = Math.max(
    1,
    ...trend6Data.map((d) => d.ideas),
    1
  );
  const yTrend6Max = Math.max(4, Math.ceil(trend6Max * 1.15));

  const statusBarData = Object.entries(ideasByStatus)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const gridStroke = 'var(--lh-line)';
  const axisMuted = 'var(--lh-muted)';

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total ideas"
          value={kpis.totalIdeas}
          subLabel={`MoM ideas ${monthlyGrowth.ideasPct >= 0 ? '+' : ''}${monthlyGrowth.ideasPct}% · +${today.newIdeas} today`}
          icon={Lightbulb}
          trendPct={monthlyGrowth.ideasPct}
        />
        <StatCard
          label="Active collaborations"
          value={kpis.activeProjects}
          subLabel="Accepted collab requests"
          icon={FolderKanban}
          trendPct={trends.ideasPct}
        />
        <StatCard
          label="Total users"
          value={kpis.totalUsers}
          subLabel={`MoM signups ${monthlyGrowth.usersPct >= 0 ? '+' : ''}${monthlyGrowth.usersPct}% · +${today.newUsers} today`}
          icon={Users}
          trendPct={monthlyGrowth.usersPct}
        />
        <StatCard
          label="Published ideas"
          value={kpis.publishedIdeas}
          subLabel={`Review queue ${scanQueue.pending} · avg score ${scanQueue.avgScore}`}
          icon={Sparkles}
          trendPct={trends.queuePct}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12">
        <div
          className={cn(
            'min-h-[300px] border p-5 xl:col-span-5',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <h3
            className={cn(
              'text-sm font-semibold',
              'text-[var(--lh-ink)]'
            )}
          >
            Ideas trend
          </h3>
          <p
            className={cn(
              'mb-2 text-[11px]',
              'text-[var(--lh-muted)]'
            )}
          >
            New ideas per month (last 6 months, UTC)
          </p>
          <div
            className="h-[240px] w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend6Data}
                margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="trend6Glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={gridStroke}
                  strokeDasharray="4 8"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisMuted, fontSize: 11 }}
                  axisLine={{ stroke: 'var(--lh-line)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, yTrend6Max]}
                  tick={{ fill: axisMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--lh-bg)',
                    border: '1px solid var(--lh-line)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ideas"
                  name="New ideas"
                  stroke={TEAL}
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: 'var(--lh-bg)',
                    stroke: TEAL,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, fill: TEAL }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-5 xl:col-span-7">
        <div
          className={cn(
            'min-h-[320px] border p-5 lg:col-span-3',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <h3
            className={cn(
              'mb-2 text-sm font-semibold',
              'text-[var(--lh-ink)]'
            )}
          >
            Weekly activity
          </h3>
          <p
            className={cn(
              'mb-2 text-[11px]',
              'text-[var(--lh-muted)]'
            )}
          >
            New users vs new ideas (last 7 days)
          </p>
          <div className="h-[280px] w-full min-w-0 sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={lineData}
                margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="adminAreaUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminAreaIdeas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INK} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={INK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={gridStroke}
                  strokeDasharray="4 8"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisMuted, fontSize: 11 }}
                  axisLine={{ stroke: 'var(--lh-line)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, yAxisMax]}
                  tick={{ fill: axisMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--lh-bg)',
                    border: '1px solid var(--lh-line)',
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: 'none',
                  }}
                  labelStyle={{
                    color: 'var(--lh-ink)',
                    fontWeight: 600,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="users"
                  fill="url(#adminAreaUsers)"
                  stroke="none"
                  legendType="none"
                  isAnimationActive
                />
                <Area
                  type="monotone"
                  dataKey="ideas"
                  fill="url(#adminAreaIdeas)"
                  stroke="none"
                  legendType="none"
                  isAnimationActive
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: 'var(--lh-bg)',
                    stroke: TEAL,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: TEAL,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ideas"
                  name="Ideas"
                  stroke={INK}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: 'var(--lh-bg)',
                    stroke: INK,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: INK,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className={cn(
            'min-h-[320px] border p-5 lg:col-span-2',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <h3
            className={cn(
              'mb-1 text-sm font-semibold',
              'text-[var(--lh-ink)]'
            )}
          >
            Ideas by category
          </h3>
          <div className="relative h-[200px] w-full">
            {donutData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-xs text-[var(--lh-muted)]">
                No published ideas yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <div
                          className={cn(
                            'rounded border px-2 py-1 text-[10px]',
                            'border-[var(--lh-line)] bg-[var(--lh-surface)]'
                          )}
                        >
                          {String(payload[0].name)}: {payload[0].value}
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {donutTotal > 0 ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    'text-[var(--lh-ink)]'
                  )}
                >
                  {donutTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--lh-muted)]">total</p>
              </div>
            ) : null}
          </div>
          <ul className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto text-[10px]">
            {donutData.map((d) => (
              <li key={d.name} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.fill }}
                />
                <span className={'text-[var(--lh-muted)]'}>
                  {d.name} · {d.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>

      <div
        className={cn(
          'border p-5',
          'border-[var(--lh-line)] bg-[var(--lh-bg)]'
        )}
      >
        <h3
          className={cn(
            'mb-1 text-sm font-semibold',
            'text-[var(--lh-ink)]'
          )}
        >
          Ideas by status
        </h3>
        <p className="mb-2 text-[11px] text-[var(--lh-muted)]">
          Counts across all workflow states
        </p>
        {statusBarData.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--lh-muted)]">No ideas yet</p>
        ) : (
          <div className="h-[min(280px,42vh)] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={statusBarData}
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  stroke={gridStroke}
                  strokeDasharray="4 8"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: axisMuted, fontSize: 10 }}
                  axisLine={{ stroke: 'var(--lh-line)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: axisMuted, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--lh-bg)',
                    border: '1px solid var(--lh-line)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  fill={TEAL}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className={cn(
            'border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className={cn(
                'text-sm font-semibold',
                'text-[var(--lh-ink)]'
              )}
            >
              Recent ideas
            </h3>
            <Link
              href="/admin/ideas"
              className={cn(
                'text-[11px] font-medium',
                'text-[var(--lh-accent)] hover:underline'
              )}
            >
              All ideas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className={cn('text-[var(--lh-muted)]')}>
                  <th className="pb-2 pr-2 font-medium">Title</th>
                  <th className="pb-2 pr-2 font-medium">Author</th>
                  <th className="pb-2 pr-2 font-medium">Cat</th>
                  <th className="pb-2 pr-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Votes</th>
                </tr>
              </thead>
              <tbody>
                {recentIdeasFeed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-[var(--lh-muted)]">
                      No ideas yet
                    </td>
                  </tr>
                ) : (
                  recentIdeasFeed.map((idea) => (
                    <tr
                      key={idea._id}
                      className={cn(
                        'border-t',
                        'border-[var(--lh-line)]'
                      )}
                    >
                      <td className="max-w-[140px] truncate py-1.5 pr-2 font-medium">
                        <Link
                          href={`/ideas/${idea._id}`}
                          className={cn(
                            'hover:underline',
                            'text-[var(--lh-ink)]'
                          )}
                        >
                          {idea.title}
                        </Link>
                      </td>
                      <td className="truncate py-1.5 pr-2 text-[var(--lh-muted)]">
                        {authorLabel(idea)}
                      </td>
                      <td className="py-1.5 pr-2 text-[var(--lh-muted)]">{idea.category}</td>
                      <td className="py-1.5 pr-2">
                        <span className="border border-[var(--lh-line)] px-1.5 py-0.5 text-[10px] text-[var(--lh-muted)]">
                          {idea.status}
                        </span>
                      </td>
                      <td className="py-1.5 tabular-nums text-[var(--lh-muted)]">
                        {idea.likeCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={cn(
            'border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <h3
            className={cn(
              'mb-3 text-sm font-semibold',
              'text-[var(--lh-ink)]'
            )}
          >
            Top contributors
          </h3>
          <ul className="space-y-2">
            {topContributors.length === 0 ? (
              <li className="text-xs text-[var(--lh-muted)]">No published ideas yet.</li>
            ) : (
              topContributors.map((row, i) => (
                <li
                  key={row.userId}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2 py-2',
                    'border-[var(--lh-line)] bg-[var(--lh-surface)]'
                  )}
                >
                  <span className="w-5 text-center text-xs font-bold text-[var(--lh-muted)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-xs font-medium',
                        'text-[var(--lh-ink)]'
                      )}
                    >
                      {row.fullName}
                    </p>
                    <p className="truncate text-[10px] text-[var(--lh-muted)]">
                      @{row.username} · {row.ideasCount} ideas
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-[var(--lh-accent)]">
                    {row.votesReceived} ♥
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div
          className={cn(
            'border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-bg)]'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className={cn(
                'text-sm font-semibold',
                'text-[var(--lh-ink)]'
              )}
            >
              Pending approvals
            </h3>
            <Link
              href="/admin/scan-queue"
              className={cn(
                'text-[11px] font-medium',
                'text-[var(--lh-accent)] hover:underline'
              )}
            >
              Queue →
            </Link>
          </div>
          <ul className="space-y-2">
            {pendingApprovals.length === 0 ? (
              <li className="text-xs text-[var(--lh-muted)]">Queue is clear.</li>
            ) : (
              pendingApprovals.map((idea) => (
                <li key={idea._id}>
                  <Link
                    href={`/ideas/${idea._id}`}
                    className={cn(
                      'flex flex-col gap-0.5 rounded-lg border px-2 py-2 transition',
                      'border-[var(--lh-line)] bg-[var(--lh-surface)] hover:border-[var(--lh-accent)]'
                    )}
                  >
                    <span
                      className={cn(
                        'truncate text-xs font-medium',
                        'text-[var(--lh-ink)]'
                      )}
                    >
                      {idea.title}
                    </span>
                    <span className="truncate text-[10px] text-[var(--lh-muted)]">
                      {authorLabel(idea)} · {idea.status}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className={cn(
            'border border-[var(--lh-line)] bg-[var(--lh-bg)] p-4'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className={cn(
                'text-sm font-semibold',
                'text-[var(--lh-ink)]'
              )}
            >
              Top ideas
            </h3>
            <Link
              href="/admin/ideas"
              className={cn(
                'text-[11px] font-medium',
                'text-[var(--lh-accent)] hover:underline'
              )}
            >
              View all ideas →
            </Link>
          </div>
          <ul className="space-y-2">
            {topIdeas.length === 0 ? (
              <li className="text-xs text-[var(--lh-muted)]">No published ideas.</li>
            ) : (
              topIdeas.map((idea, rank) => (
                <li key={idea._id}>
                  <Link
                    href={`/ideas/${idea._id}`}
                    className={cn(
                      'flex items-center gap-2 border border-[var(--lh-line)] bg-[var(--lh-surface)] px-2 py-2 transition hover:border-[var(--lh-accent)]'
                    )}
                  >
                    <span className="w-6 text-center text-xs font-bold text-[var(--lh-muted)]">
                      {rank + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-xs font-medium',
                          'text-[var(--lh-ink)]'
                        )}
                      >
                        {idea.title}
                      </p>
                      <p className="truncate text-[10px] text-[var(--lh-muted)]">
                        {authorLabel(idea)} · {idea.category}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--lh-muted)]">
                      {idea.likeCount} likes
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div
          className={cn(
            'border border-[var(--lh-line)] bg-[var(--lh-bg)] p-4'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className={cn(
                'text-sm font-semibold',
                'text-[var(--lh-ink)]'
              )}
            >
              Recent users
            </h3>
            <Link
              href="/admin/users"
              className={cn(
                'text-[11px] font-medium',
                'text-[var(--lh-accent)] hover:underline'
              )}
            >
              View all users →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentUsers.length === 0 ? (
              <li className="text-xs text-[var(--lh-muted)]">No users.</li>
            ) : (
              recentUsers.map((u) => (
                <li
                  key={u._id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2 py-2',
                    'border-[var(--lh-line)] bg-[var(--lh-surface)]'
                  )}
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-700">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                        {u.fullName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-xs font-medium',
                        'text-[var(--lh-ink)]'
                      )}
                    >
                      {u.fullName}
                    </p>
                    <p className="truncate text-[10px] text-[var(--lh-muted)]">@{u.username}</p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-medium',
                      u.status === 'active'
                        ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300'
                        : u.status === 'banned'
                          ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                          : 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
                    )}
                  >
                    {u.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className={cn(
            'flex items-center gap-3 border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-surface)]'
          )}
        >
          <MessageSquareWarning className="h-8 w-8 text-[var(--lh-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--lh-muted)]">
              Comments
            </p>
            <p className="landing-display text-lg font-semibold text-[var(--lh-ink)]">
              {comments.total.toLocaleString()} total
            </p>
            <Link
              href="/admin/comments"
              className="text-[11px] font-medium text-[var(--lh-accent)] underline"
            >
              {comments.flagged} flagged · Moderate →
            </Link>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-3 border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-surface)]'
          )}
        >
          <Clock className="h-8 w-8 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200/90">
              Pending review
            </p>
            <p className="text-lg font-bold text-amber-950 dark:text-amber-50">
              {scanQueue.pending} ideas
            </p>
            <Link
              href="/admin/scan-queue"
              className="text-[11px] font-medium text-amber-800 underline dark:text-amber-200"
            >
              Review now →
            </Link>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-3 border p-4',
            'border-[var(--lh-line)] bg-[var(--lh-accent-soft)]'
          )}
        >
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200/90">
              Approved today
            </p>
            <p className="text-lg font-bold text-emerald-950 dark:text-emerald-50">
              {scanQueue.approvedToday}
            </p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-3 border p-4',
            'border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30'
          )}
        >
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-red-800 dark:text-red-200/90">
              Rejected today
            </p>
            <p className="text-lg font-bold text-red-950 dark:text-red-50">
              {scanQueue.rejectedToday}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-2 gap-2 border p-3 sm:grid-cols-4',
          'border-[var(--lh-line)] bg-[var(--lh-surface)]'
        )}
      >
        <div>
          <p className="text-[9px] uppercase text-[var(--lh-muted)]">DAU</p>
          <p className="text-sm font-semibold">{legacy.dau}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-[var(--lh-muted)]">MAU (30d)</p>
          <p className="text-sm font-semibold">{legacy.mau}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-[var(--lh-muted)]">Rejection rate</p>
          <p className="text-sm font-semibold">
            {(legacy.rejectionRate * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-[var(--lh-muted)]">Total likes (sum)</p>
          <p className="text-sm font-semibold">{overview.totalLikes.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
