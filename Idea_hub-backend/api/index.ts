/**
 * Vercel HTTP entry — minimal shell; loads compiled app on first request.
 * Keeps cold-start failures inside the handler (JSON error) instead of FUNCTION_INVOCATION_FAILED.
 *
 * Do NOT statically import ../src/* here — @vercel/node bundles that into one ESM file and
 * Express/body-parser break with "Dynamic require is not supported".
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

type HttpHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

let cachedApp: HttpHandler | null = null;
let loadPromise: Promise<HttpHandler> | null = null;

async function loadExpressApp(): Promise<HttpHandler> {
  const { markRuntimeStarted } = await import('../dist/lib/runtime-state.js');
  markRuntimeStarted('vercel');

  const { createApp } = await import('../dist/app.js');
  const app = createApp();
  return app as unknown as HttpHandler;
}

function getApp(): Promise<HttpHandler> {
  if (cachedApp) return Promise.resolve(cachedApp);
  if (!loadPromise) {
    loadPromise = loadExpressApp()
      .then((app) => {
        cachedApp = app;
        return app;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

function sendBootstrapError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[vercel] bootstrap failed:', err);
  if (res.headersSent) return;
  res.statusCode = 500;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      success: false,
      message: 'API failed to start',
      code: 'BOOTSTRAP_ERROR',
      detail: message,
      data: null,
      errors: [],
    })
  );
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    sendBootstrapError(res, err);
  }
}
