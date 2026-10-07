import { Router, type NextFunction, type Request, type Response } from 'express';

import { ensureApiReady } from '../bootstrap-api.js';
import { buildHealthReport } from '../services/health.service.js';
import { renderHealthPage } from './health-page.js';

export const healthRouter = Router();

async function sendHealthHtml(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await ensureApiReady();
    const report = await buildHealthReport();
    const code = report.status === 'unhealthy' ? 503 : 200;
    res.status(code).type('html').send(renderHealthPage(report));
  } catch (err) {
    next(err);
  }
}

async function sendHealthJson(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await ensureApiReady();
    const report = await buildHealthReport();
    const code = report.status === 'unhealthy' ? 503 : 200;
    res.status(code).json(report);
  } catch (err) {
    next(err);
  }
}

/** Site root & primary status page (HTML) */
healthRouter.get('/', sendHealthHtml);
healthRouter.get('/health', sendHealthHtml);

/** Machine-readable health for monitors / uptime checks */
healthRouter.get('/health/json', sendHealthJson);

/** Legacy path → canonical /health */
healthRouter.get('/health/page', (_req, res) => {
  res.redirect(301, '/health');
});
