import axios from 'axios';

import { dailyDomain, liveRoomProvider } from '../config/live.config.js';

const DAILY_API = 'https://api.daily.co/v1';

export async function dailyCreateRoom(roomName: string): Promise<void> {
  if (liveRoomProvider() !== 'daily') return;
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) return;
  try {
    await axios.post(
      `${DAILY_API}/rooms`,
      { name: roomName, privacy: 'public' },
      { headers: { Authorization: `Bearer ${key}` }, timeout: 15_000 }
    );
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return;
    }
    throw err;
  }
}

export async function dailyMeetingToken(params: {
  roomName: string;
  userName: string;
  isOwner: boolean;
}): Promise<string> {
  const key = process.env.DAILY_API_KEY?.trim();
  if (!key) throw new Error('DAILY_API_KEY is not set');
  const { data } = await axios.post<{ token: string }>(
    `${DAILY_API}/meeting-tokens`,
    {
      properties: {
        room_name: params.roomName,
        user_name: params.userName.slice(0, 80),
        is_owner: params.isOwner,
      },
    },
    { headers: { Authorization: `Bearer ${key}` }, timeout: 15_000 }
  );
  if (!data?.token) throw new Error('Daily token response missing token');
  return data.token;
}

export function dailyRoomJoinUrl(roomName: string, token: string): string {
  const domain = dailyDomain();
  if (!domain) return '';
  const encRoom = encodeURIComponent(roomName);
  const encT = encodeURIComponent(token);
  return `https://${domain}/${encRoom}?t=${encT}`;
}
