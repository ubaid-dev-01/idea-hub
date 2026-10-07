import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('eslint').Linter.Config[]} */
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'dist/**'] },
  ...nextCoreWebVitals,
];

export default config;
