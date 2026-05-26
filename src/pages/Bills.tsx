import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenants } from '../hooks/useTenants';
import {
  usePreviousReadings,
  useReadingsForPeriod,
} from '../hooks/useReadings';
import { useBillsForPeriod, useInsertBills } from '../hooks/useBills';
import {
  buildBillInsertsForPeriod,
  type SkipReason,
  type SkippedTenant,
} from '../lib/bills';
import {
  formatPeriodLabel,
  getCurrentPeriod,
  isValidPeriod,
} from '../lib/period';
import type { Bill, Tenant } from '../types/db';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function skipReasonLabel(reason: SkipReason): string {
  switch (reason) {
    case 'already-billed':
      return 'Already billed for this period';
    case 'no-reading':
      return 'No reading entered for this period';
    case 'invalid-reading':
      return 'Reading went backwards (current < previous)';
  }
}

export default function Bills() {
  const { user, signOut } = useAuth();

  const [period, setPeriod] = useState(() => getCurrentPeriod());

  const tenantsQuery = useTenants();
  const billsQuery = useBillsForPeriod(period);
  const readingsQuery = useReadingsForPeriod(period);
  const previousReadingsQuery = usePreviousReadings(period);
  const insertBills = useInsertBills();

  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(
    null,
  );

  const activeTenants: Tenant[] = useMemo(() => {
    return (tenantsQuery.data ?? [])
      .filter((t) => t.active)
      .sort((a, b) => a.room_number.localeCompare(b.room_number));
  }, [tenantsQuery.data]);

  const allLoaded =
    !tenantsQuery.isLoading &&
    !billsQuery.isLoading &&
    !readingsQuery.isLoading &&
    !previousReadingsQuery.isLoading;

  // Compute the (would-insert, would-skip) breakdown synchronously from the
  // already-loaded query data. The Generate button uses this to decide whether
  // there's anything to generate, and the page renders "skipped" hints inline.
  const orchestration = useMemo(() => {
    if (!allLoaded || !isValidPeriod(period)) {
      return { inserts: [], skipped: [] as SkippedTenant[] };
    }
    return buildBillInsertsForPeriod({
      tenants: activeTenants,
      readings: readingsQuery.data ?? [],
      previousReadings: previousReadingsQuery.data ?? new Map(),
      existingBills: billsQuery.data ?? [],
      period,
    });
  }, [
    allLoaded,
    activeTenants,
    readingsQuery.data,
    previousReadingsQuery.data,
    billsQuery.data,
    period,
  ]);

  const bills = useMemo<Bill[]>(
    () => billsQuery.data ?? [],
    [billsQuery.data],
  );
  const billsByTenant = useMemo(() => {
    const m = new Map<string, Bill>();
    for (const b of bills) m.set(b.tenant_id, b);
    return m;
  }, [bills]);

  const totals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;
    for (const b of bills) {
      const amt = Number(b.total_amount);
      billed += amt;
      if (b.status === 'paid') collected += amt;
      else outstanding += amt;
    }
    return { billed, collected, outstanding };
  }, [bills]);

  async function handleGenerate() {
    setGenerationError(null);
    setGenerationSuccess(null);
    if (orchestration.inserts.length === 0) {
      setGenerationError(
        'Nothing to generate. Either every tenant is already billed for this period or no readings exist yet.',
      );
      return;
    }
    try {
      const created = await insertBills.mutateAsync(orchestration.inserts);
      setGenerationSuccess(
        `Generated ${created.length} bill${created.length === 1 ? '' : 's'} for ${formatPeriodLabel(period)}.`,
      );
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : String(err));
    }
  }

  function handlePeriodChange(p: string) {
    if (!isValidPeriod(p)) return;
    setPeriod(p);
    setGenerationError(null);
    setGenerationSuccess(null);
  }

  const isGenerating = insertBills.isPending;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <nav className="text-xs text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-300">
                ← Dashboard
              </Link>
            </nav>
            <h1 className="text-2xl font-bold">Bills</h1>
            <p className="text-sm text-slate-400 break-all">
              Signed in as <span className="text-slate-300">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline whitespace-nowrap"
          >
            Sign out
          </button>
        </header>

        {/* Period + generate */}
        <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3 items-end">
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
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !allLoaded ||
                  orchestration.inserts.length === 0
                }
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating
                  ? 'Generating…'
                  : `Generate ${orchestration.inserts.length} bill${
                      orchestration.inserts.length === 1 ? '' : 's'
                    }`}
              </button>
            </div>
          </div>
          {!allLoaded && (
            <p className="text-xs text-slate-500">Loading…</p>
          )}
          {allLoaded && activeTenants.length === 0 && (
            <p className="text-xs text-slate-500">
              No active tenants. Add one on the Tenants page first.
            </p>
          )}
          {generationError && (
            <p
              role="alert"
              className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
            >
              {generationError}
            </p>
          )}
          {generationSuccess && !generationError && (
            <p
              role="status"
              className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded px-3 py-2"
            >
              {generationSuccess}
            </p>
          )}
        </section>

        {/* Bills list */}
        {bills.length > 0 && (
          <section className="space-y-3" aria-label="Bills for period">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Bills ({bills.length})
            </h2>
            <div className="space-y-2">
              {activeTenants.map((t) => {
                const bill = billsByTenant.get(t.id);
                if (!bill) return null;
                const isPaid = bill.status === 'paid';
                return (
                  <Link
                    key={bill.id}
                    to={`/bill/${bill.id}`}
                    className="block border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-slate-100">
                          {t.room_number} — {t.name}
                        </h3>
                        <dl className="text-xs text-slate-400 space-y-0.5">
                          {bill.elec_amount != null && (
                            <div className="flex gap-2">
                              <dt>Electricity</dt>
                              <dd>
                                {bill.elec_kwh ?? 0} kWh ×{' '}
                                {phpFormat.format(Number(bill.elec_rate ?? 0))}
                                /kWh ={' '}
                                {phpFormat.format(Number(bill.elec_amount))}
                              </dd>
                            </div>
                          )}
                          {bill.water_amount != null && (
                            <div className="flex gap-2">
                              <dt>Water</dt>
                              <dd>
                                {bill.water_m3 ?? 0} m³ ×{' '}
                                {phpFormat.format(Number(bill.water_rate ?? 0))}
                                /m³ ={' '}
                                {phpFormat.format(Number(bill.water_amount))}
                              </dd>
                            </div>
                          )}
                          {bill.rent_amount != null && (
                            <div className="flex gap-2">
                              <dt>Rent</dt>
                              <dd>
                                {phpFormat.format(Number(bill.rent_amount))}
                              </dd>
                            </div>
                          )}
                          {bill.extras_amount != null &&
                            Number(bill.extras_amount) > 0 && (
                              <div className="flex gap-2">
                                <dt>Extras</dt>
                                <dd>
                                  {phpFormat.format(Number(bill.extras_amount))}
                                  {bill.extras_note && (
                                    <span className="text-slate-500">
                                      {' '}
                                      — {bill.extras_note}
                                    </span>
                                  )}
                                </dd>
                              </div>
                            )}
                        </dl>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-bold text-slate-100">
                          {phpFormat.format(Number(bill.total_amount))}
                        </p>
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                            isPaid
                              ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
                              : 'border-amber-700/50 bg-amber-900/20 text-amber-300'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Totals footer */}
            <div className="border border-slate-700 bg-slate-800/40 rounded-lg p-4">
              <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide">
                    Total billed
                  </dt>
                  <dd className="text-lg font-semibold text-slate-100">
                    {phpFormat.format(totals.billed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide">
                    Collected
                  </dt>
                  <dd className="text-lg font-semibold text-emerald-300">
                    {phpFormat.format(totals.collected)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide">
                    Outstanding
                  </dt>
                  <dd className="text-lg font-semibold text-amber-300">
                    {phpFormat.format(totals.outstanding)}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {/* Skipped tenants — only shown when there are tenants we couldn't bill */}
        {orchestration.skipped.length > 0 && (
          <section
            className="border border-amber-900/30 bg-amber-950/20 rounded-lg p-4 space-y-2"
            aria-label="Skipped tenants"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Not billed ({orchestration.skipped.length})
            </h2>
            <ul className="text-sm text-slate-300 space-y-1">
              {orchestration.skipped.map((s) => (
                <li
                  key={s.tenant.id}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="text-slate-100">
                    {s.tenant.room_number} — {s.tenant.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {skipReasonLabel(s.reason)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {bills.length === 0 && allLoaded && activeTenants.length > 0 && (
          <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-6 text-center">
            No bills yet for {formatPeriodLabel(period)}.{' '}
            {orchestration.inserts.length > 0
              ? 'Click "Generate" above.'
              : 'Enter readings on the Readings page first.'}
          </p>
        )}
      </div>
    </div>
  );
}
