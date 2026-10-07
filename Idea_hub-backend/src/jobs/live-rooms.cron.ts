import cron from 'node-cron';

import { liveRoomsEnabled } from '../config/live.config.js';
import { LiveRoom } from '../models/index.js';
import {
  notifyLiveRoomRsvpReminder,
  roomsNeedingRsvpReminder,
} from '../services/live-rooms.service.js';

cron.schedule(
  '*/2 * * * *',
  async () => {
    if (!liveRoomsEnabled()) return;
    try {
      const due = await roomsNeedingRsvpReminder();
      for (const room of due) {
        await notifyLiveRoomRsvpReminder(room);
        await LiveRoom.updateOne(
          { _id: room._id },
          { $set: { rsvpReminderSentAt: new Date() } }
        );
      }
      if (due.length > 0) {
        console.log(`[live-rooms] RSVP reminders for ${due.length} room(s)`);
      }
    } catch (err) {
      console.error('[live-rooms] cron', err);
    }
  },
  { timezone: 'UTC' }
);
