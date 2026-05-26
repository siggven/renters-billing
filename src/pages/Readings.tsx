import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTenants } from '../hooks/useTenants';
import {
  useFatherWaterMainForPeriod,
  usePreviousFatherWaterMain,
  usePreviousReadings,
  useReadingsForPeriod,
  useUpsertFatherWaterMain,
  useUpsertReadings,
} from '../hooks/useReadings';
import { TopNav } from '../components/TopNav';
import {
  formatPeriodLabel,
  getCurrentPeriod,
  isValidPeriod,
  lastDayOfPeriod,
} from '../lib/period';
import { isValid, validateReading } from '../lib/validation';
import type {
  FatherWaterMainReadingInput,
  ReadingInput,
  Tenant,
} from '../types/db';

// ─── Formatting helpers ────────────────────────────────────────────────────

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const numberFormat = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 2,
});

function parseNullableNumber(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN; // surface NaN to validators
}

// ─── State shapes ──────────────────────────────────────────────────────────

interface RowState {
  electricity_reading: string;
  water_reading: string;
}

interface FatherState {
  reading_value: string;
  amount_owed_upstream: string;
}

type RowErrors = Partial<Record<'electricity_reading' | 'water_reading', string>>;

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Readings() {
  const tenantsQuery = useTenants();
  const [period, setPeriod] = useState(() => getCurrentPeriod());
  const [readingDate, setReadingDate] = useState(() =>
    lastDayOfPeriod(getCurrentPeriod()),
  );

  const readingsForPeriod = useReadingsForPeriod(period);
  const previousReadings = usePreviousReadings(period);
  const fatherForPeriod = useFatherWaterMainForPeriod(period);
  const previousFather = usePreviousFatherWaterMain(period);

  const upsertReadings = useUpsertReadings();
  const upsertFather = useUpsertFatherWaterMain();

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [father, setFather] = useState<FatherState>({
    reading_value: '',
    amount_owed_upstream: '',
  });

  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({});
  const [fatherError, setFatherError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeTenants = useMemo<Tenant[]>(() => {
    return (tenantsQuery.data ?? [])
      .filter((t) => t.active)
      .sort((a, b) => a.room_number.localeCompare(b.room_number));
  }, [tenantsQuery.data]);

  // Seed local form state from server data once the queries resolve for this
  // period. We re-seed when (a) the period changes or (b) the underlying data
  // for this period changes (e.g., after a save). Tracking by a string key
  // built from period + a "data version" stops us from clobbering edits.
  const lastSeededKeyRef = useRef<string | null>(null);
  const readingsLoaded = !readingsForPeriod.isLoading;
  const fatherLoaded = !fatherForPeriod.isLoading;
  const seedKey = `${period}|t:${activeTenants.length}|r:${readingsForPeriod.dataUpdatedAt}|f:${fatherForPeriod.dataUpdatedAt}`;

  useEffect(() => {
    if (!readingsLoaded || !fatherLoaded) return;
    if (lastSeededKeyRef.current === seedKey) return;

    const next: Record<string, RowState> = {};
    for (const t of activeTenants) {
      const existing = readingsForPeriod.data?.find(
        (r) => r.tenant_id === t.id,
      );
      next[t.id] = {
        electricity_reading: existing?.electricity_reading?.toString() ?? '',
        water_reading: existing?.water_reading?.toString() ?? '',
      };
    }
    setRows(next);

    const f = fatherForPeriod.data;
    setFather({
      reading_value: f?.reading_value?.toString() ?? '',
      amount_owed_upstream: f?.amount_owed_upstream?.toString() ?? '',
    });

    const savedDate =
      f?.reading_date ?? readingsForPeriod.data?.[0]?.reading_date ?? null;
    setReadingDate(savedDate ?? lastDayOfPeriod(period));

    setRowErrors({});
    setFatherError(null);
    setSaveError(null);
    lastSeededKeyRef.current = seedKey;
  }, [
    seedKey,
    readingsLoaded,
    fatherLoaded,
    activeTenants,
    readingsForPeriod.data,
    fatherForPeriod.data,
    period,
  ]);

  function handlePeriodChange(newPeriod: string) {
    if (!isValidPeriod(newPeriod)) return;
    setPeriod(newPeriod);
    setReadingDate(lastDayOfPeriod(newPeriod));
    setSaveError(null);
    setRowErrors({});
    setFatherError(null);
  }

  function setRowField(
    tenantId: string,
    field: 'electricity_reading' | 'water_reading',
    value: string,
  ) {
    setRows((prev) => ({
      ...prev,
      [tenantId]: { ...prev[tenantId], [field]: value },
    }));
    setRowErrors((prev) => {
      if (!prev[tenantId]?.[field]) return prev;
      const next = { ...prev };
      const row = { ...next[tenantId] };
      delete row[field];
      if (Object.keys(row).length === 0) {
        delete next[tenantId];
      } else {
        next[tenantId] = row;
      }
      return next;
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaveError(null);
    setRowErrors({});
    setFatherError(null);

    if (!isValidPeriod(period)) {
      setSaveError('Period is invalid.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(readingDate)) {
      setSaveError('Reading date is invalid.');
      return;
    }

    const rowInputs: ReadingInput[] = [];
    const collectedErrors: Record<string, RowErrors> = {};

    for (const t of activeTenants) {
      const row = rows[t.id] ?? { electricity_reading: '', water_reading: '' };
      const elec = parseNullableNumber(row.electricity_reading);
      const water = !t.has_water
        ? null
        : parseNullableNumber(row.water_reading);

      // Skip empty rows entirely
      if (
        (elec === null || Number.isNaN(elec)) &&
        (water === null || Number.isNaN(water))
      ) {
        if (Number.isNaN(elec) || Number.isNaN(water)) {
          // user typed something non-numeric — surface as an error rather than skip
          collectedErrors[t.id] = {
            ...(Number.isNaN(elec) && { electricity_reading: 'Must be a number' }),
            ...(Number.isNaN(water) && { water_reading: 'Must be a number' }),
          };
        }
        continue;
      }

      const prev = previousReadings.data?.get(t.id);
      const errs = validateReading({
        period,
        reading_date: readingDate,
        electricity_reading: Number.isNaN(elec) ? null : elec,
        water_reading: Number.isNaN(water) ? null : water,
        prevElectricity: prev?.electricity_reading ?? null,
        prevWater: prev?.water_reading ?? null,
        hasWater: t.has_water,
      });

      // Map non-row-level errors (period, reading_date) to a global save error
      if (errs.period || errs.reading_date) {
        setSaveError(
          errs.period ?? errs.reading_date ?? 'Period or reading date is invalid.',
        );
        return;
      }

      const rowErrs: RowErrors = {};
      if (errs.electricity_reading) {
        rowErrs.electricity_reading = errs.electricity_reading;
      }
      if (errs.water_reading) rowErrs.water_reading = errs.water_reading;
      if (Number.isNaN(elec)) rowErrs.electricity_reading ??= 'Must be a number';
      if (Number.isNaN(water)) rowErrs.water_reading ??= 'Must be a number';

      if (!isValid(rowErrs)) {
        collectedErrors[t.id] = rowErrs;
        continue;
      }

      rowInputs.push({
        tenant_id: t.id,
        period,
        reading_date: readingDate,
        electricity_reading: elec,
        water_reading: water,
      });
    }

    // Father main
    const fatherValue = parseNullableNumber(father.reading_value);
    let fatherInput: FatherWaterMainReadingInput | null = null;
    // Track father-section errors locally — `fatherError` from React state
    // is captured at function-call time, so reading it after a setFatherError()
    // call returns the stale (pre-call) value. A local flag avoids the
    // stale-closure trap.
    let fatherHasError = false;
    if (fatherValue !== null) {
      if (Number.isNaN(fatherValue) || fatherValue < 0) {
        setFatherError('Reading must be a number ≥ 0');
        fatherHasError = true;
      } else {
        const prev = previousFather.data;
        if (prev && fatherValue < Number(prev.reading_value)) {
          setFatherError(
            `Reading must be ≥ previous (${prev.reading_value})`,
          );
          fatherHasError = true;
        } else {
          const owed = parseNullableNumber(father.amount_owed_upstream);
          if (owed !== null && (Number.isNaN(owed) || owed < 0)) {
            setFatherError('Amount owed upstream must be a number ≥ 0');
            fatherHasError = true;
          } else {
            fatherInput = {
              period,
              reading_date: readingDate,
              reading_value: fatherValue,
              amount_owed_upstream: owed,
            };
          }
        }
      }
    }

    if (Object.keys(collectedErrors).length > 0 || fatherHasError) {
      setRowErrors(collectedErrors);
      setSaveError(
        'Some rows have errors. Fix the highlighted fields and try again.',
      );
      return;
    }

    if (rowInputs.length === 0 && !fatherInput) {
      setSaveError('Nothing to save — fill in at least one reading.');
      return;
    }

    try {
      await Promise.all([
        rowInputs.length > 0
          ? upsertReadings.mutateAsync(rowInputs)
          : Promise.resolve(),
        fatherInput
          ? upsertFather.mutateAsync(fatherInput)
          : Promise.resolve(),
      ]);
      toast.success(`Saved readings for ${formatPeriodLabel(period)}.`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  const isSaving = upsertReadings.isPending || upsertFather.isPending;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <TopNav />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Meter readings</h1>
          <p className="text-sm text-slate-400">
            Enter monthly electricity + water readings. Re-saving the same month upserts.
          </p>
        </header>

        {/* Period + reading date */}
        <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="period"
                className="block text-sm text-slate-300"
              >
                Period
              </label>
              <input
                id="period"
                type="month"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <p className="text-xs text-slate-500">
                {isValidPeriod(period)
                  ? formatPeriodLabel(period)
                  : 'Pick a month'}
              </p>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="reading_date"
                className="block text-sm text-slate-300"
              >
                Reading date
              </label>
              <input
                id="reading_date"
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
              />
              <p className="text-xs text-slate-500">
                Defaults to the last day of the period
              </p>
            </div>
          </div>
        </section>

        {/* Per-tenant rows */}
        {tenantsQuery.isLoading && (
          <p className="text-sm text-slate-400">Loading tenants…</p>
        )}

        {tenantsQuery.error && (
          <div
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            Failed to load tenants: {String(tenantsQuery.error)}
          </div>
        )}

        {!tenantsQuery.isLoading && activeTenants.length === 0 && (
          <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-6 text-center">
            No active tenants. Add one on the Tenants page first.
          </p>
        )}

        {activeTenants.length > 0 && (
          <section className="space-y-3" aria-label="Tenant readings">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Tenants ({activeTenants.length})
            </h2>
            {activeTenants.map((t) => {
              const row = rows[t.id] ?? {
                electricity_reading: '',
                water_reading: '',
              };
              const errs = rowErrors[t.id] ?? {};
              const prev = previousReadings.data?.get(t.id) ?? null;

              const elecNum = parseNullableNumber(row.electricity_reading);
              const elecDelta =
                elecNum !== null &&
                !Number.isNaN(elecNum) &&
                prev?.electricity_reading != null
                  ? Number(elecNum) - Number(prev.electricity_reading)
                  : null;

              const waterNum = parseNullableNumber(row.water_reading);
              const waterDelta =
                waterNum !== null &&
                !Number.isNaN(waterNum) &&
                prev?.water_reading != null
                  ? Number(waterNum) - Number(prev.water_reading)
                  : null;

              return (
                <article
                  key={t.id}
                  className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {t.room_number} — {t.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        ₱{numberFormat.format(t.electricity_per_kwh)}/kWh
                        {t.has_water && t.water_per_m3 != null && (
                          <> · ₱{numberFormat.format(t.water_per_m3)}/m³</>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        t.type === 'renter'
                          ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
                          : 'border-sky-700/50 bg-sky-900/20 text-sky-300'
                      }`}
                    >
                      {t.type === 'renter' ? 'Renter' : 'Non-renter'}
                    </span>
                  </header>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Electricity */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`elec-${t.id}`}
                        className="block text-sm text-slate-300"
                      >
                        Electricity reading (kWh)
                      </label>
                      <input
                        id={`elec-${t.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.electricity_reading}
                        onChange={(e) =>
                          setRowField(
                            t.id,
                            'electricity_reading',
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                        inputMode="decimal"
                      />
                      <p className="text-xs text-slate-500">
                        prev:{' '}
                        {prev?.electricity_reading != null
                          ? numberFormat.format(Number(prev.electricity_reading))
                          : '— (first reading)'}
                      </p>
                      {elecDelta !== null && elecDelta >= 0 && (
                        <p className="text-xs text-emerald-300">
                          {numberFormat.format(elecDelta)} kWh used ={' '}
                          {phpFormat.format(elecDelta * t.electricity_per_kwh)}
                        </p>
                      )}
                      {errs.electricity_reading && (
                        <p className="text-xs text-red-300">
                          {errs.electricity_reading}
                        </p>
                      )}
                    </div>

                    {/* Water (only when has_water) */}
                    {t.has_water ? (
                      <div className="space-y-1">
                        <label
                          htmlFor={`water-${t.id}`}
                          className="block text-sm text-slate-300"
                        >
                          Water reading (m³)
                        </label>
                        <input
                          id={`water-${t.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.water_reading}
                          onChange={(e) =>
                            setRowField(t.id, 'water_reading', e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                          inputMode="decimal"
                        />
                        <p className="text-xs text-slate-500">
                          prev:{' '}
                          {prev?.water_reading != null
                            ? numberFormat.format(Number(prev.water_reading))
                            : '— (first reading)'}
                        </p>
                        {waterDelta !== null && waterDelta >= 0 && (
                          <p className="text-xs text-emerald-300">
                            {numberFormat.format(waterDelta)} m³ used ={' '}
                            {phpFormat.format(
                              waterDelta * (t.water_per_m3 ?? 0),
                            )}
                          </p>
                        )}
                        {errs.water_reading && (
                          <p className="text-xs text-red-300">
                            {errs.water_reading}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 self-center sm:pt-6">
                        No water sub-meter
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* Father water main */}
        <section
          className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3"
          aria-label="Father's water main"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Father&apos;s water main
          </h2>
          <p className="text-xs text-slate-500">
            Sub-meter from the upstream owner. Informational — not billed back to
            renters; tells you how much father owes upstream this month.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="father_reading"
                className="block text-sm text-slate-300"
              >
                Reading (m³)
              </label>
              <input
                id="father_reading"
                type="number"
                step="0.01"
                min="0"
                value={father.reading_value}
                onChange={(e) =>
                  setFather({ ...father, reading_value: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                inputMode="decimal"
              />
              <p className="text-xs text-slate-500">
                prev:{' '}
                {previousFather.data?.reading_value != null
                  ? numberFormat.format(Number(previousFather.data.reading_value))
                  : '— (first reading)'}
              </p>
              {(() => {
                const cur = parseNullableNumber(father.reading_value);
                const prev = previousFather.data?.reading_value;
                if (
                  cur !== null &&
                  !Number.isNaN(cur) &&
                  prev != null &&
                  Number(cur) - Number(prev) >= 0
                ) {
                  return (
                    <p className="text-xs text-emerald-300">
                      {numberFormat.format(Number(cur) - Number(prev))} m³ from
                      upstream
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="father_owed"
                className="block text-sm text-slate-300"
              >
                Amount owed upstream (₱)
              </label>
              <input
                id="father_owed"
                type="number"
                step="0.01"
                min="0"
                value={father.amount_owed_upstream}
                onChange={(e) =>
                  setFather({ ...father, amount_owed_upstream: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                placeholder="optional"
                inputMode="decimal"
              />
              <p className="text-xs text-slate-500">
                Optional — what father pays the upstream owner this period
              </p>
            </div>
          </div>
          {fatherError && (
            <p role="alert" className="text-xs text-red-300">
              {fatherError}
            </p>
          )}
        </section>

        {/* Save bar */}
        {saveError && (
          <div
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            {saveError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || activeTenants.length === 0}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving…' : 'Save all readings'}
          </button>
        </div>
      </main>
    </div>
  );
}
