import cron from 'node-cron';
import mongoose from 'mongoose';

import {
  aiCoachEnabled,
  coachDailyBriefTimezone,
} from '../config/ai-coach.config.js';
import { Idea } from '../models/index.js';
import {
  buildDailyBrief,
  deliverDailyBriefNotification,
} from '../services/AICoachService.js';

cron.schedule(
  '0 9 * * *',
  async () => {
    if (!aiCoachEnabled()) return;
    try {
      const raw = await Idea.distinct('authorId', {
        status: 'published',
      });
      let n = 0;
      for (const id of raw) {
        const uid = String(id);
        if (!mongoose.Types.ObjectId.isValid(uid)) continue;
        try {
          const brief = await buildDailyBrief(uid);
          if (brief) {
            await deliverDailyBriefNotification(uid, brief);
            n += 1;
          }
        } catch (err) {
          console.warn('[ai-coach] brief user', uid, err);
        }
      }
      if (n > 0) {
        console.log(`[ai-coach] Daily brief notifications: ${n} user(s)`);
      }
    } catch (err) {
      console.error('[ai-coach] Daily cron failed:', err);
    }
  },
  { timezone: coachDailyBriefTimezone() }
);
