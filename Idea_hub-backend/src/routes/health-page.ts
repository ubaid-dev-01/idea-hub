import type { HealthReport } from '../services/health.service.js';

function statusColor(status: HealthReport['status']): string {
  if (status === 'healthy') return '#10b981';
  if (status === 'degraded') return '#f59e0b';
  return '#ef4444';
}

function statusLabel(status: HealthReport['status']): string {
  if (status === 'healthy') return 'All systems operational';
  if (status === 'degraded') return 'Partial outage — some services degraded';
  return 'Major outage — action required';
}

function boolBadge(on: boolean, onLabel = 'Enabled', offLabel = 'Disabled'): string {
  const color = on ? '#10b981' : '#64748b';
  const bg = on ? '#10b98118' : '#64748b18';
  const label = on ? onLabel : offLabel;
  return `<span class="pill" style="color:${color};background:${bg};border-color:${color}44">${label}</span>`;
}

function row(label: string, value: string): string {
  return `<tr><th>${label}</th><td>${value}</td></tr>`;
}

function metricCard(
  title: string,
  value: string,
  subtitle: string,
  accent: string
): string {
  return `<article class="metric" style="--accent:${accent}">
    <p class="metric-label">${title}</p>
    <p class="metric-value">${value}</p>
    <p class="metric-sub">${subtitle}</p>
  </article>`;
}

export function renderHealthPage(report: HealthReport): string {
  const accent = statusColor(report.status);
  const mongoOk = report.mongodb.connected;
  const redisOk = report.redis.configured && report.redis.connected;
  const redisLabel = !report.redis.configured
    ? 'Not configured'
    : report.redis.connected
      ? `Connected · ${report.redis.pingMs}ms`
      : report.redis.error ?? 'Unavailable';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <meta http-equiv="refresh" content="30" />
  <title>Ideas Hub API — System Status</title>
  <style>
    :root {
      --bg: #05080f;
      --surface: #0c1220;
      --surface-2: #111827;
      --border: #1f2937;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: ${accent};
      --cyan: #22d3ee;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      font-family: "Segoe UI", ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, #0e749033, transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, #0891b218, transparent);
      color: var(--text);
      line-height: 1.5;
    }
    .shell { max-width: 960px; margin: 0 auto; padding: 40px 20px 64px; }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 32px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .logo {
      width: 48px; height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0891b2, #22d3ee);
      display: grid; place-items: center;
      font-weight: 800; font-size: 1.1rem; color: #042f2e;
      box-shadow: 0 0 32px #22d3ee33;
    }
    h1 { font-size: 1.65rem; font-weight: 700; letter-spacing: -0.02em; }
    .tagline { color: var(--muted); font-size: 0.95rem; margin-top: 2px; }
    .status-banner {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid var(--accent)44;
      background: linear-gradient(90deg, ${accent}14, transparent);
      margin-bottom: 28px;
    }
    .status-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 12px var(--accent);
      flex-shrink: 0;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
    .status-title { font-weight: 700; text-transform: capitalize; color: var(--accent); }
    .status-desc { font-size: 0.875rem; color: var(--muted); margin-top: 2px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .metric {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      border-top: 3px solid var(--accent);
    }
    .metric-label {
      font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 0.1em; color: var(--muted); margin-bottom: 8px;
    }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: var(--text); }
    .metric-sub { font-size: 0.8rem; color: var(--muted); margin-top: 6px; }
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 22px;
      margin-bottom: 16px;
    }
    .panel h2 {
      font-size: 0.72rem; text-transform: uppercase;
      letter-spacing: 0.12em; color: var(--cyan);
      margin-bottom: 14px; font-weight: 600;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th {
      text-align: left; color: var(--muted); font-weight: 500;
      padding: 10px 12px 10px 0; border-bottom: 1px solid var(--border);
      width: 38%; vertical-align: top;
    }
    td {
      padding: 10px 0; border-bottom: 1px solid var(--border);
      color: var(--text); word-break: break-word;
    }
    tr:last-child th, tr:last-child td { border-bottom: none; }
    .pill {
      display: inline-block; padding: 3px 10px;
      border-radius: 999px; font-size: 0.78rem; font-weight: 600;
      border: 1px solid transparent;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    footer {
      margin-top: 32px; padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 0.82rem; color: var(--muted);
      display: flex; flex-wrap: wrap; gap: 12px 20px;
      align-items: center; justify-content: space-between;
    }
    a { color: var(--cyan); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .links { display: flex; flex-wrap: wrap; gap: 16px; }
    @media (max-width: 600px) {
      .shell { padding: 24px 16px 48px; }
      h1 { font-size: 1.35rem; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="logo" aria-hidden="true">IH</div>
        <div>
          <h1>Ideas Hub API</h1>
          <p class="tagline">Production status &amp; service health</p>
        </div>
      </div>
      <div class="pill" style="color:var(--muted);background:#1e293b;border-color:#334155">
        v${report.version}
      </div>
    </header>

    <section class="status-banner" role="status" aria-live="polite">
      <div class="status-dot" aria-hidden="true"></div>
      <div>
        <p class="status-title">${report.status}</p>
        <p class="status-desc">${statusLabel(report.status)}</p>
      </div>
    </section>

    <section class="metrics" aria-label="Key metrics">
      ${metricCard('Uptime', report.uptime.human, `Since ${new Date(report.startedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`, '#22d3ee')}
      ${metricCard('MongoDB', mongoOk ? 'Operational' : 'Down', report.mongodb.pingMs != null ? `Latency ${report.mongodb.pingMs}ms` : (report.mongodb.error ?? report.mongodb.state), mongoOk ? '#10b981' : '#ef4444')}
      ${metricCard('Redis', !report.redis.configured ? 'N/A' : redisOk ? 'Operational' : 'Degraded', redisLabel, !report.redis.configured ? '#64748b' : redisOk ? '#10b981' : '#f59e0b')}
      ${metricCard('Runtime', report.runtime.mode, `Node ${report.runtime.nodeVersion} · ${report.runtime.env}`, '#a78bfa')}
    </section>

    <div class="grid-2">
      <section class="panel">
        <h2>Server</h2>
        <table>
          ${row('Region', report.server.region ?? '—')}
          ${row('Deployment', report.server.deployment ?? '—')}
          ${row('Service URL', report.server.url ? `<a href="${report.server.url}">${report.server.url}</a>` : '—')}
          ${row('Last checked', new Date(report.checkedAt).toLocaleString())}
          ${row('Process memory', `${report.process.memoryMb.heapUsed} MB heap / ${report.process.memoryMb.rss} MB RSS`)}
        </table>
      </section>

      <section class="panel">
        <h2>Database</h2>
        <table>
          ${row('MongoDB', mongoOk ? '<span style="color:#10b981">Connected</span>' : '<span style="color:#ef4444">Disconnected</span>')}
          ${row('Database', report.mongodb.database ?? '—')}
          ${row('Host', report.mongodb.host ?? '—')}
          ${row('Redis', redisLabel)}
        </table>
      </section>
    </div>

    <section class="panel">
      <h2>Feature flags</h2>
      <table>
        ${row('Validation engine', boolBadge(report.features.validationEngine))}
        ${row('Gamification', boolBadge(report.features.gamification))}
        ${row('AI Coach', boolBadge(report.features.aiCoach))}
        ${row('Live rooms', boolBadge(report.features.liveRooms))}
        ${row('Background jobs', boolBadge(report.features.backgroundCrons, 'Active (VM)', 'Serverless (off)'))}
      </table>
    </section>

    <footer>
      <span>Auto-refreshes every 30 seconds</span>
      <nav class="links" aria-label="API links">
        <a href="/health/json">JSON status</a>
        <a href="/api/auth">API</a>
      </nav>
    </footer>
  </div>
</body>
</html>`;
}
