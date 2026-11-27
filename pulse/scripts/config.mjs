import { existsSync, writeFileSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const teamSite = 'https://pulse-reels-studio.opto-touchaw-6470.chatgpt.site';
const teamProject = 'https://jwghygpkxouawphpjosw.supabase.co';
let url = process.env.SUPABASE_URL || '';
let key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const demo = process.env.PULSE_LOCAL_DEMO === '1';

if (demo) {
  url = '';
  key = '';
} else if (!url && !key) {
  const response = await fetch(teamSite + '/pulse-config.js', {
    redirect: 'error', signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Error('Could not load the team configuration from the deployed Pulse site.');
  // Read the JSON assignment as data. Never execute the downloaded script.
  const assignment = /^window\.PULSE_CONFIG\s*=\s*(\{[^]*\})\s*;\s*$/.exec(await response.text());
  if (!assignment) throw Error('Invalid team configuration. Check the deployed Pulse site.');
  ({ url, key } = JSON.parse(assignment[1]));
  if (url !== teamProject) throw Error('The deployed configuration points to a different Supabase project.');
}

if (!demo && (typeof url !== 'string' || new URL(url).protocol !== 'https:' ||
    typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))) {
  throw Error('Pulse needs an HTTPS Supabase URL and a publishable key.');
}
const openFourRegistry = process.env.PULSE_OPENFOUR_REGISTRY?.trim() || '';
if (openFourRegistry && !/^0x[0-9a-f]{40}$/i.test(openFourRegistry)) {
  throw Error('PULSE_OPENFOUR_REGISTRY must be an EVM address.');
}
writeFileSync('dist/pulse-config.js', 'window.PULSE_CONFIG = ' + JSON.stringify({ url, key, openFourRegistry }) + ';\n');
