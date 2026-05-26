/**
 * Cleanup: deletes all rows seeded by `seed-screenshot-sentinel.mjs`
 * (periods 2023-12 and 2024-01 across readings, father_water_main_readings,
 * father_electricity_main_readings, bills).
 *
 * Reads creds from .env.test.local, never echoes them.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(file) {
  const out = {};
  const raw = readFileSync(resolve(file), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnv('.env.test.local');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const { error: signInErr } = await supabase.auth.signInWithPassword({
  email: env.SMOKE_TEST_EMAIL,
  password: env.SMOKE_TEST_PASSWORD,
});
if (signInErr) {
  console.error('signIn failed:', signInErr.message);
  process.exit(1);
}
console.log('✓ signed in as <test user redacted>');

const PERIODS = ['2023-12', '2024-01'];

for (const tableInfo of [
  { name: 'bills', label: 'bills' },
  { name: 'readings', label: 'readings' },
  { name: 'father_water_main_readings', label: 'water-main' },
  { name: 'father_electricity_main_readings', label: 'meralco-main' },
]) {
  for (const period of PERIODS) {
    const { count: before } = await supabase
      .from(tableInfo.name)
      .select('id', { count: 'exact', head: true })
      .eq('period', period);

    const { error: delErr } = await supabase
      .from(tableInfo.name)
      .delete()
      .eq('period', period);

    const { count: after } = await supabase
      .from(tableInfo.name)
      .select('id', { count: 'exact', head: true })
      .eq('period', period);

    if (delErr) {
      console.error(`  ${tableInfo.label} ${period}: ${delErr.message}`);
    } else {
      console.log(
        `  ✓ ${tableInfo.label} ${period}: ${before ?? 0} → ${after ?? 0}`,
      );
    }
  }
}

await supabase.auth.signOut();
console.log('✓ done');
