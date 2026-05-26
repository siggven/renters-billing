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

// T4.5: `rates` table dropped (migration 0002). Per-tenant rates live on tenants.
// T11: `father_electricity_main_readings` added (migration 0003).
const tables = [
  'tenants',
  'readings',
  'father_water_main_readings',
  'father_electricity_main_readings',
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
// We use `tenants` as the sentinel target (since `rates` was dropped in T4.5).
{
  const { error } = await anon.from('tenants').insert({
    name: 'smoke-test-anon-insert-should-be-rejected',
    room_number: '__smoke_anon_sentinel__',
    type: 'non_renter',
    has_water: false,
    electricity_per_kwh: 0.0001,
  });
  if (error) {
    ok(`tenants: anon INSERT denied (${error.code ?? error.status ?? 'err'})`);
  } else {
    fail('tenants: anon INSERT SUCCEEDED — RLS is broken!');
  }
}

// ── 2. Authenticated client — full round-trip ──────────────────────────────
console.log('\n— authenticated client (expect full CRUD) —');
const authed = createClient(URL, KEY);
const sentinelRoom = '__smoke_sentinel__';

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
//
// Tenants is now the sentinel target. We insert a non-renter (no rent / no
// water) so we satisfy every CHECK constraint on the table including the
// T4.5 ones (electricity_per_kwh >= 0, has_water=false relaxes water_per_m3).
{
  // ensure a clean slate
  await authed.from('tenants').delete().eq('room_number', sentinelRoom);

  const { error: insErr } = await authed.from('tenants').insert({
    name: 'smoke-test-sentinel — auto-deleted',
    room_number: sentinelRoom,
    type: 'non_renter',
    monthly_rent: null,
    rent_due_day: null,
    has_water: false,
    electricity_per_kwh: 0.0001,
    water_per_m3: null,
    extras_amount: 0,
    extras_note: null,
    active: true,
  });
  if (insErr) {
    fail(`tenants: authed INSERT failed (${insErr.message})`);
  } else {
    ok('tenants: authed INSERT ok (sentinel row inserted)');
  }

  const { data: anonRows } = await anon
    .from('tenants')
    .select('*')
    .eq('room_number', sentinelRoom);
  if (!anonRows || anonRows.length === 0) {
    ok('tenants: anon cannot see authed-inserted row (RLS round-trip)');
  } else {
    fail(`tenants: anon CAN see the row — RLS broken!`);
  }

  const { data: authedRows, error: selErr } = await authed
    .from('tenants')
    .select('*')
    .eq('room_number', sentinelRoom);
  if (selErr || !authedRows || authedRows.length !== 1) {
    fail(
      `tenants: authed cannot find sentinel (${selErr?.message ?? 'no row'})`,
    );
  } else {
    ok('tenants: authed sees its own sentinel row');
  }

  const { error: delErr } = await authed
    .from('tenants')
    .delete()
    .eq('room_number', sentinelRoom);
  if (delErr) {
    fail(`tenants: cleanup DELETE failed (${delErr.message})`);
  } else {
    ok('tenants: cleanup DELETE ok');
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
