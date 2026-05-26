import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenants } from '../hooks/useTenants';
import { useBillsForPeriod } from '../hooks/useBills';
import { useFatherWaterMainForPeriod } from '../hooks/useReadings';
import {
  buildUnmarkConfirmMessage,
  useMarkBillPaid,
  useMarkBillUnpaid,
} from '../hooks/useBill';
import { MarkPaidModal } from '../components/MarkPaidModal';
import {
  formatPeriodLabel,
  getCurrentPeriod,
} from '../lib/period';
import type { Bill } from '../types/db';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

interface SummaryCardProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warn';
  hint?: string;
}

function SummaryCard({ label, value, tone = 'neutral', hint }: SummaryCardProps) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-300'
        : 'text-slate-100';
  return (
    <div className="border border-slate-700 bg-slate-800/40 rounded-lg p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();

  const period = getCurrentPeriod();

  const tenantsQuery = useTenants();
  const billsQuery = useBillsForPeriod(period);
  const fatherMainQuery = useFatherWaterMainForPeriod(period);

  const markPaid = useMarkBillPaid();
  const markUnpaid = useMarkBillUnpaid();

  const [markPaidTarget, setMarkPaidTarget] = useState<Bill | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const activeTenants = useMemo(() => {
    return (tenantsQuery.data ?? [])
      .filter((t) => t.active)
      .sort((a, b) => a.room_number.localeCompare(b.room_number));
  }, [tenantsQuery.data]);

  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data]);

  const summary = useMemo(() => {
    let paidCount = 0;
    let collected = 0;
    let outstanding = 0;
    for (const b of bills) {
      const amt = Number(b.total_amount);
      if (b.status === 'paid') {
        paidCount += 1;
        collected += amt;
      } else {
        outstanding += amt;
      }
    }
    return {
      paidCount,
      total: bills.length,
      collected,
      outstanding,
    };
  }, [bills]);

  const owedUpstream = fatherMainQuery.data?.amount_owed_upstream;
  const owedUpstreamNumber =
    owedUpstream != null ? Number(owedUpstream) : null;

  const billsByTenant = useMemo(() => {
    const m = new Map<string, (typeof bills)[number]>();
    for (const b of bills) m.set(b.tenant_id, b);
    return m;
  }, [bills]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BahayBills</h1>
            <p className="text-sm text-slate-400">
              {formatPeriodLabel(period)} · signed in as{' '}
              <span className="text-slate-300 break-all">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline whitespace-nowrap"
          >
            Sign out
          </button>
        </header>

        {/* Summary cards (FR-31) */}
        <section
          aria-label="Current month summary"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <SummaryCard
            label="Paid / Total"
            value={`${summary.paidCount} / ${summary.total}`}
            tone={
              summary.total === 0
                ? 'neutral'
                : summary.paidCount === summary.total
                  ? 'good'
                  : 'neutral'
            }
            hint={summary.total === 0 ? 'No bills yet this month' : undefined}
          />
          <SummaryCard
            label="Collected"
            value={phpFormat.format(summary.collected)}
            tone="good"
          />
          <SummaryCard
            label="Outstanding"
            value={phpFormat.format(summary.outstanding)}
            tone={summary.outstanding > 0 ? 'warn' : 'neutral'}
          />
          <SummaryCard
            label="Owed upstream (water)"
            value={
              owedUpstreamNumber != null
                ? phpFormat.format(owedUpstreamNumber)
                : '—'
            }
            hint={
              owedUpstreamNumber == null
                ? 'No father-main reading yet'
                : 'From the upstream owner this month'
            }
          />
        </section>

        {/* Current-month bill list (FR-32) */}
        <section aria-label="Current month bills" className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              This month — {formatPeriodLabel(period)}
            </h2>
            <Link
              to="/bills"
              className="text-xs text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
            >
              Manage bills →
            </Link>
          </div>

          {tenantsQuery.isLoading || billsQuery.isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : bills.length === 0 ? (
            <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-6 text-center">
              No bills generated for {formatPeriodLabel(period)} yet.{' '}
              <Link
                to="/bills"
                className="text-emerald-300 hover:underline underline-offset-4"
              >
                Generate them →
              </Link>
            </p>
          ) : (
            activeTenants.map((t) => {
              const bill = billsByTenant.get(t.id);
              if (!bill) return null;
              const isPaid = bill.status === 'paid';
              return (
                <Link
                  key={bill.id}
                  to={`/bill/${bill.id}`}
                  className="block border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {t.room_number} — {t.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {phpFormat.format(Number(bill.total_amount))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                          isPaid
                            ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
                            : 'border-amber-700/50 bg-amber-900/20 text-amber-300'
                        }`}
                      >
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPaymentError(null);
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
                                setPaymentError(
                                  err instanceof Error
                                    ? err.message
                                    : String(err),
                                ),
                              );
                          }
                        }}
                        disabled={
                          markPaid.isPending || markUnpaid.isPending
                        }
                        className={`text-xs px-3 py-1 rounded border transition-colors disabled:opacity-50 ${
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
            })
          )}

          {paymentError && (
            <p
              role="alert"
              className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
            >
              {paymentError}
            </p>
          )}
        </section>

        {/* Quick links — replaces the older nav-card section */}
        <nav
          aria-label="Quick links"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-300"
        >
          <Link
            to="/tenants"
            className="text-center border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg py-2 transition-colors"
          >
            Tenants
          </Link>
          <Link
            to="/readings"
            className="text-center border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg py-2 transition-colors"
          >
            Readings
          </Link>
          <Link
            to="/bills"
            className="text-center border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg py-2 transition-colors"
          >
            Bills
          </Link>
          <Link
            to="/history"
            className="text-center border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg py-2 transition-colors"
          >
            History
          </Link>
        </nav>
      </div>

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
              setMarkPaidTarget(null);
            } catch (err) {
              setPaymentError(err instanceof Error ? err.message : String(err));
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}
