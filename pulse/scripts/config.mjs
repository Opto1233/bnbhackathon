import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (url || key) {
  if (!/^https:\/\//.test(url) || !key.startsWith('sb_publishable_'))
    throw Error('Set an HTTPS Supabase URL and an sb_publishable_ key in .env.local.');
}
writeFileSync('dist/pulse-config.js', 'window.PULSE_CONFIG = ' + JSON.stringify({ url, key }) + ';\n');
