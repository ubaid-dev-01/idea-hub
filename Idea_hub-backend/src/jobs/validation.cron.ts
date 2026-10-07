import cron from 'node-cron';

import { recalculateAllPublishedIdeas } from '../services/ValidationEngine.js';

if (String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() === 'true') {
  cron.schedule(
    '0 4 * * *',
    async () => {
      console.log('[validation] Daily refresh (force AI) starting…');
      try {
        const n = await recalculateAllPublishedIdeas({
          forceAi: true,
          batchSize: 20,
        });
        console.log(`[validation] Daily refresh completed for ${n} ideas`);
      } catch (err) {
        console.error('[validation] Daily cron failed:', err);
      }
    },
    { timezone: 'UTC' }
  );
}
