export type RuntimeMode = 'vercel' | 'node-server';

let startedAt: Date | null = null;
let runtimeMode: RuntimeMode | null = null;
let listenPort: number | null = null;

export function markRuntimeStarted(
  mode: RuntimeMode,
  port?: number
): void {
  if (!startedAt) startedAt = new Date();
  runtimeMode = mode;
  if (port != null) listenPort = port;
}

export function getRuntimeStartedAt(): Date {
  return startedAt ?? new Date();
}

export function getRuntimeMode(): RuntimeMode {
  return runtimeMode ?? (process.env.VERCEL ? 'vercel' : 'node-server');
}

export function getListenPort(): number | null {
  return listenPort;
}

export function getUptimeSeconds(): number {
  const start = getRuntimeStartedAt().getTime();
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
