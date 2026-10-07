import cron from 'node-cron';

import { runWeeklyGamificationReset } from '../services/gamification.service.js';

if (String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true') {
  cron.schedule(
    '0 0 * * 1',
    async () => {
      try {
        await runWeeklyGamificationReset();
      } catch (err) {
        console.error('[gamification] Weekly reset cron failed:', err);
      }
    },
    { timezone: 'UTC' }
  );
}
