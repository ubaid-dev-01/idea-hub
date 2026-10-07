/** Live rooms — Daily.co (or mock) + participant limits */

export const LIVE_FREE_MAX_PARTICIPANTS = 10;
export const LIVE_PRO_MAX_PARTICIPANTS = 200;

export type LiveRoomProvider = 'daily' | 'mock';

export function liveRoomsEnabled(): boolean {
  return String(process.env.ENABLE_LIVE_ROOMS ?? '').toLowerCase() === 'true';
}

export function liveRoomProvider(): LiveRoomProvider {
  const key = process.env.DAILY_API_KEY?.trim();
  if (key) return 'daily';
  return 'mock';
}

export function dailyDomain(): string {
  return process.env.DAILY_DOMAIN?.trim() || '';
}
