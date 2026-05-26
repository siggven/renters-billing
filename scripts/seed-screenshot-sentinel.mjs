/**
 * One-shot seed for README screenshot capture.
 *
 * Inserts sentinel data for an obviously-past period (2024-01) plus a
 * "previous month" reference set (2023-12), then a couple of bills (one paid,
 * rest unpaid). All data is deletable by `cleanup-screenshot-sentinel.mjs`.
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

// Fetch the 4 active tenants — bills + readings will reference these.
const { data: tenants, error: tenantsErr } = await supabase
  .from('tenants')
  .select('*')
  .eq('active', true)
  .order('room_number', { ascending: true });
if (tenantsErr) {
  console.error('failed to fetch tenants:', tenantsErr.message);
  process.exit(1);
}
console.log(`  found ${tenants.length} active tenants`);
if (tenants.length === 0) {
  console.error('no active tenants found; cannot seed bills');
  process.exit(1);
}

// Seed previous-month readings (2023-12) so 2024-01 bills aren't first-month.
const PREV_PERIOD = '2023-12';
const PREV_DATE = '2023-12-31';
const CUR_PERIOD = '2024-01';
const CUR_DATE = '2024-01-31';

// Plausible meter values — round numbers so the math reads cleanly in the screenshots.
function readingsForTenant(tenant, period, reading_date, elec_offset, water_offset) {
  return {
    tenant_id: tenant.id,
    period,
    reading_date,
    electricity_reading: 1000 + elec_offset,
    water_reading: tenant.has_water ? 100 + water_offset : null,
  };
}

const prevReadings = [];
const curReadings = [];
tenants.forEach((t, i) => {
  // Each tenant uses ~50 kWh + ~5 m³ that month — easy to multiply by their rate.
  prevReadings.push(readingsForTenant(t, PREV_PERIOD, PREV_DATE, i * 100, i * 10));
  curReadings.push(readingsForTenant(t, CUR_PERIOD, CUR_DATE, i * 100 + 50, i * 10 + 5));
});

const { error: prevErr } = await supabase
  .from('readings')
  .upsert(prevReadings, { onConflict: 'tenant_id,period' });
if (prevErr) console.error('  prev readings:', prevErr.message);
else console.log(`  ✓ ${prevReadings.length} prev-month readings (${PREV_PERIOD}) seeded`);

const { error: curErr } = await supabase
  .from('readings')
  .upsert(curReadings, { onConflict: 'tenant_id,period' });
if (curErr) console.error('  cur readings:', curErr.message);
else console.log(`  ✓ ${curReadings.length} cur-month readings (${CUR_PERIOD}) seeded`);

// Father's water main + Meralco main for both periods, for completeness on the
// readings/dashboard screenshots if the user lands there from the History row.
await supabase.from('father_water_main_readings').upsert(
  [
    { period: PREV_PERIOD, reading_date: PREV_DATE, reading_value: 500, amount_owed_upstream: 1500 },
    { period: CUR_PERIOD, reading_date: CUR_DATE, reading_value: 525, amount_owed_upstream: 1750 },
  ],
  { onConflict: 'period' },
);

await supabase.from('father_electricity_main_readings').upsert(
  [
    { period: PREV_PERIOD, reading_date: PREV_DATE, amount_billed: 4800, reading_value: 5000 },
    { period: CUR_PERIOD, reading_date: CUR_DATE, amount_billed: 5285.5, reading_value: 5200 },
  ],
  { onConflict: 'period' },
);
console.log('  ✓ father water-main + Meralco-main rows seeded for both periods');

// Build bills via the same arithmetic the app uses.
const bills = [];
for (let i = 0; i < tenants.length; i++) {
  const t = tenants[i];
  const prev = prevReadings[i];
  const cur = curReadings[i];

  const elec_kwh = cur.electricity_reading - prev.electricity_reading;
  const elec_amount = +(elec_kwh * Number(t.electricity_per_kwh)).toFixed(2);

  const water_m3 = t.has_water ? cur.water_reading - prev.water_reading : 0;
  const water_amount = t.has_water
    ? +(water_m3 * Number(t.water_per_m3)).toFixed(2)
    : 0;

  const rent_amount = t.type === 'renter' ? Number(t.monthly_rent ?? 0) : 0;
  const extras_amount = Number(t.extras_amount ?? 0);
  const total_amount = +(elec_amount + water_amount + rent_amount + extras_amount).toFixed(2);

  bills.push({
    tenant_id: t.id,
    period: CUR_PERIOD,
    generated_at: new Date().toISOString(),
    prev_elec: prev.electricity_reading,
    curr_elec: cur.electricity_reading,
    elec_kwh,
    elec_rate: Number(t.electricity_per_kwh),
    elec_amount,
    prev_water: t.has_water ? prev.water_reading : null,
    curr_water: t.has_water ? cur.water_reading : null,
    water_m3: t.has_water ? water_m3 : null,
    water_rate: t.has_water ? Number(t.water_per_m3) : null,
    water_amount,
    rent_amount,
    extras_amount,
    extras_note: t.extras_note,
    total_amount,
    status: i === 0 ? 'paid' : 'unpaid', // mark the first one paid for variety
    paid_date: i === 0 ? '2024-02-05' : null,
    paid_note: i === 0 ? 'cash via Messenger' : null,
  });
}

const { error: billsErr } = await supabase.from('bills').upsert(bills, {
  onConflict: 'tenant_id,period',
});
if (billsErr) console.error('  bills:', billsErr.message);
else
  console.log(
    `  ✓ ${bills.length} bills seeded for ${CUR_PERIOD} (1 paid, ${bills.length - 1} unpaid)`,
  );

await supabase.auth.signOut();
console.log('✓ done; ready for screenshots');
