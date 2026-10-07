/**
 * Smoke-test the Vercel entry: load api handler, hit /health.
 * Run: npm run build && node --import tsx scripts/smoke-vercel-entry.mjs
 */
import http from 'node:http';

const { default: handler } = await import('../api/index.ts');

const server = http.createServer((req, res) => {
  handler(req, res);
});

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

const res = await fetch(`http://127.0.0.1:${port}/health`);
const text = await res.text();
const rootRes = await fetch(`http://127.0.0.1:${port}/`);
const rootText = await rootRes.text();
console.log('/health status', res.status, 'type', res.headers.get('content-type'));
console.log('/ status', rootRes.status, 'type', rootRes.headers.get('content-type'));
console.log('body preview', text.slice(0, 120));

server.close();
if (res.status >= 500 || rootRes.status >= 500) process.exit(1);
if (!text.includes('<!DOCTYPE html>') || !rootText.includes('<!DOCTYPE html>')) {
  console.error('expected HTML on / and /health');
  process.exit(1);
}
