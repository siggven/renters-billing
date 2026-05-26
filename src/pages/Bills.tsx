import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTenants } from '../hooks/useTenants';
import {
  usePreviousReadings,
  useReadingsForPeriod,
} from '../hooks/useReadings';
import { useBillsForPeriod, useInsertBills } from '../hooks/useBills';
import {
  useMarkBillPaid,
  useMarkBillUnpaid,
  buildUnmarkConfirmMessage,
} from '../hooks/useBill';
import { MarkPaidModal } from '../components/MarkPaidModal';
import { TopNav } from '../components/TopNav';
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
  const [period, setPeriod] = useState(() => getCurrentPeriod());

  const tenantsQuery = useTenants();
  const billsQuery = useBillsForPeriod(period);
  const readingsQuery = useReadingsForPeriod(period);
  const previousReadingsQuery = usePreviousReadings(period);
  const insertBills = useInsertBills();
  const markPaid = useMarkBillPaid();
  const markUnpaid = useMarkBillUnpaid();

  const [generationError, setGenerationError] = useState<string | null>(null);
  /** Bill row currently selected as the target of the Mark-as-paid modal. */
  const [markPaidTarget, setMarkPaidTarget] = useState<Bill | null>(null);

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

  const bills = useMemo<Bill[]>(() => billsQuery.data ?? [], [billsQuery.data]);
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
    if (orchestration.inserts.length === 0) {
      setGenerationError(
        'Nothing to generate. Either every tenant is already billed for this period or no readings exist yet.',
      );
      return;
    }
    try {
      const created = await insertBills.mutateAsync(orchestration.inserts);
      toast.success(
        `Generated ${created.length} bill${created.length === 1 ? '' : 's'} for ${formatPeriodLabel(period)}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg);
      toast.error(`Failed to generate bills: ${msg}`);
    }
  }

  function handlePeriodChange(p: string) {
    if (!isValidPeriod(p)) return;
    setPeriod(p);
    setGenerationError(null);
  }

  const isGenerating = insertBills.isPending;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <TopNav />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Bills</h1>
          <p className="text-sm text-slate-400">
            Generate per-tenant bills for a chosen period; mark them paid here
            or on the receipt.
          </p>
        </header>

        {/* Period + generate */}
        <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label htmlFor="period" className="block text-sm text-slate-300">
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
          {!allLoaded && <p className="text-xs text-slate-500">Loading…</p>}
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
                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
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
                        {/* Inline mark/unmark — stopPropagation so the wrapper
                            Link doesn't navigate when the button is clicked. */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isPaid) {
                              setMarkPaidTarget(bill);
                            } else {
                              if (
                                !window.confirm(
                                  buildUnmarkConfirmMessage({
                                    tenantLabel: `${t.room_number} — ${t.name}`,
                                    periodLabel: formatPeriodLabel(period),
                                  }),
                                )
                              ) {
                                return;
                              }
                              markUnpaid
                                .mutateAsync({ id: bill.id })
                                .catch((err) =>
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : String(err),
                                  ),
                                );
                            }
                          }}
                          disabled={markPaid.isPending || markUnpaid.isPending}
                          className={`block text-xs px-3 py-1 rounded border transition-colors disabled:opacity-50 ${
                            isPaid
                              ? 'border-amber-700/50 text-amber-300 hover:bg-amber-900/30'
                              : 'border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30'
                          }`}
                        >
                          {isPaid ? 'Unmark' : 'Mark paid'}
                        </button>
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
      </main>

      {/* Mark-as-paid modal — opens from inline card buttons */}
      {markPaidTarget && (
        <MarkPaidModal
          title="Mark as paid"
          subtitle={(() => {
            const t = activeTenants.find(
              (x) => x.id === markPaidTarget.tenant_id,
            );
            return t
              ? `${t.room_number} — ${t.name} · ${formatPeriodLabel(period)}`
              : formatPeriodLabel(period);
          })()}
          isSubmitting={markPaid.isPending}
          onCancel={() => setMarkPaidTarget(null)}
          onConfirm={async ({ paid_date, paid_note }) => {
            try {
              await markPaid.mutateAsync({
                id: markPaidTarget.id,
                paid_date,
                paid_note,
              });
              const t = activeTenants.find(
                (x) => x.id === markPaidTarget.tenant_id,
              );
              toast.success(
                `Marked ${t?.room_number ?? 'bill'} as paid on ${paid_date}`,
              );
              setMarkPaidTarget(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : String(err));
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}
