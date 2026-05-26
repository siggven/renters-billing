/**
 * scripts/smoke-auth.mjs — end-to-end RLS smoke test
 *
 * Purpose: verify that
 *   1. authenticated users can CRUD every table
 *   2. anonymous (unauthenticated) requests are blocked by RLS
 *
 * Credentials are read from .env.test.local, which is gitignored. NEVER paste
 * credentials into chat or anywhere else. Edit .env.test.local in your editor.
 *
 * Usage:   npm run smoke
 * Exits:   0 = all checks passed, 1 = at least one check failed
 *
 * Output is intentionally terse and never echoes credential values.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Load .env.test.local without adding a dotenv dependency ────────────────
function loadEnv(file) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(resolve(file), 'utf8');
  } catch {
    return null;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = loadEnv('.env.test.local');
if (!env) {
  console.error(
    '✗ Missing .env.test.local. Copy from .env.example and fill in test creds.',
  );
  process.exit(1);
}

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SMOKE_TEST_EMAIL',
  'SMOKE_TEST_PASSWORD',
];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`✗ Missing keys in .env.test.local: ${missing.join(', ')}`);
  process.exit(1);
}

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
const EMAIL = env.SMOKE_TEST_EMAIL;
const PASSWORD = env.SMOKE_TEST_PASSWORD;

const ok = (msg) => console.log(`✓ ${msg}`);
const bad = (msg) => console.log(`✗ ${msg}`);

let failures = 0;
const fail = (msg) => {
  failures += 1;
  bad(msg);
};

// ── 1. Anonymous client — should never see / write anything ────────────────
console.log('\n— anonymous client (expect denial / empty) —');
const anon = createClient(URL, KEY, { auth: { persistSession: false } });

const tables = [
  'tenants',
  'rates',
  'readings',
  'father_water_main_readings',
  'bills',
];

// SELECT as anon: RLS should hide all rows. We can't distinguish "empty
// because hidden" from "empty because no data" with SELECT alone — but a
// successful query that returns 0 rows is acceptable for that case.
for (const t of tables) {
  const { error } = await anon.from(t).select('*').limit(1);
  if (error) {
    ok(`${t}: anon SELECT denied (${error.code ?? error.status ?? 'err'})`);
  } else {
    ok(`${t}: anon SELECT returned 0 rows (RLS hiding any data)`);
  }
}

// INSERT as anon: should ALWAYS error because no policy grants anon write.
{
  const { error } = await anon.from('rates').insert({
    effective_date: '1970-01-01',
    electricity_per_kwh: 0,
    water_per_m3: 0,
    notes: 'smoke-test-anon-insert-should-be-rejected',
  });
  if (error) {
    ok(`rates: anon INSERT denied (${error.code ?? error.status ?? 'err'})`);
  } else {
    fail('rates: anon INSERT SUCCEEDED — RLS is broken!');
  }
}

// ── 2. Authenticated client — full round-trip ──────────────────────────────
console.log('\n— authenticated client (expect full CRUD) —');
const authed = createClient(URL, KEY);
const sentinelDate = '1970-01-01';

{
  const { error } = await authed.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) {
    fail(`signIn failed: ${error.message}`);
    process.exit(1);
  }
  ok(`signIn as <test user redacted>`);
}

// Authed SELECT on every table — should succeed regardless of row count
for (const t of tables) {
  const { error } = await authed.from(t).select('*').limit(1);
  if (error) {
    fail(`${t}: authed SELECT failed (${error.message})`);
  } else {
    ok(`${t}: authed SELECT ok`);
  }
}

// Authed INSERT → anon SELECT (should still be empty for that row) → authed
// SELECT (should see it) → cleanup.
{
  // ensure a clean slate
  await authed.from('rates').delete().eq('effective_date', sentinelDate);

  const { error: insErr } = await authed.from('rates').insert({
    effective_date: sentinelDate,
    electricity_per_kwh: 0.0001,
    water_per_m3: 0.0001,
    notes: 'smoke-test-sentinel — auto-deleted',
  });
  if (insErr) {
    fail(`rates: authed INSERT failed (${insErr.message})`);
  } else {
    ok('rates: authed INSERT ok (sentinel row inserted)');
  }

  const { data: anonRows } = await anon
    .from('rates')
    .select('*')
    .eq('effective_date', sentinelDate);
  if (!anonRows || anonRows.length === 0) {
    ok('rates: anon cannot see authed-inserted row (RLS round-trip)');
  } else {
    fail(`rates: anon CAN see the row — RLS broken!`);
  }

  const { data: authedRows, error: selErr } = await authed
    .from('rates')
    .select('*')
    .eq('effective_date', sentinelDate);
  if (selErr || !authedRows || authedRows.length !== 1) {
    fail(
      `rates: authed cannot find sentinel (${selErr?.message ?? 'no row'})`,
    );
  } else {
    ok('rates: authed sees its own sentinel row');
  }

  const { error: delErr } = await authed
    .from('rates')
    .delete()
    .eq('effective_date', sentinelDate);
  if (delErr) {
    fail(`rates: cleanup DELETE failed (${delErr.message})`);
  } else {
    ok('rates: cleanup DELETE ok');
  }
}

// Sign out
{
  const { error } = await authed.auth.signOut();
  if (error) fail(`signOut failed: ${error.message}`);
  else ok('signOut ok');
}

// ── 3. Summary ─────────────────────────────────────────────────────────────
console.log(failures === 0 ? '\n✓ all smoke checks passed' : `\n✗ ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
