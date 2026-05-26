import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenants } from '../hooks/useTenants';
import { useBillsHistory, type BillWithTenant } from '../hooks/useBills';
import { TopNav } from '../components/TopNav';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { formatPeriodLabel, isValidPeriod } from '../lib/period';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

type SortKey = 'period' | 'tenant' | 'total' | 'status' | 'generated';
type SortDir = 'asc' | 'desc';

function compareBills(
  a: BillWithTenant,
  b: BillWithTenant,
  key: SortKey,
): number {
  switch (key) {
    case 'period':
      return a.period.localeCompare(b.period);
    case 'tenant':
      return a.tenant.room_number.localeCompare(b.tenant.room_number);
    case 'total':
      return Number(a.total_amount) - Number(b.total_amount);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'generated':
      return a.generated_at.localeCompare(b.generated_at);
  }
}

export default function History() {
  const navigate = useNavigate();

  const tenantsQuery = useTenants();

  const [tenantId, setTenantId] = useState<string>('');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');

  const filters = useMemo(
    () => ({
      tenantId: tenantId || null,
      periodFrom: periodFrom && isValidPeriod(periodFrom) ? periodFrom : undefined,
      periodTo: periodTo && isValidPeriod(periodTo) ? periodTo : undefined,
    }),
    [tenantId, periodFrom, periodTo],
  );

  const billsQuery = useBillsHistory(filters);

  const [sortKey, setSortKey] = useState<SortKey>('period');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedBills = useMemo(() => {
    const arr = [...(billsQuery.data ?? [])];
    arr.sort((a, b) => {
      const cmp = compareBills(a, b, sortKey);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [billsQuery.data, sortKey, sortDir]);

  const totalRow = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;
    for (const b of sortedBills) {
      const amt = Number(b.total_amount);
      billed += amt;
      if (b.status === 'paid') collected += amt;
      else outstanding += amt;
    }
    return { billed, collected, outstanding };
  }, [sortedBills]);

  function handleSortClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'total' || key === 'period' ? 'desc' : 'asc');
    }
  }

  function clearFilters() {
    setTenantId('');
    setPeriodFrom('');
    setPeriodTo('');
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-sm text-slate-400">
            Filter past bills by tenant or period range. Click a row to open
            the receipt.
          </p>
        </header>

        {/* Filters */}
        <section
          aria-label="Filters"
          className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-3"
        >
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="filter-tenant"
                className="block text-sm text-slate-300"
              >
                Tenant
              </label>
              <select
                id="filter-tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                <option value="">All tenants</option>
                {(tenantsQuery.data ?? [])
                  .slice()
                  .sort((a, b) =>
                    a.room_number.localeCompare(b.room_number),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.room_number} — {t.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-from"
                className="block text-sm text-slate-300"
              >
                Period from
              </label>
              <input
                id="filter-from"
                type="month"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-to"
                className="block text-sm text-slate-300"
              >
                Period to
              </label>
              <input
                id="filter-to"
                type="month"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
          </div>
          {(tenantId || periodFrom || periodTo) && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Summary footer */}
        {sortedBills.length > 0 && (
          <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-4">
            <dl className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">
                  Total billed ({sortedBills.length})
                </dt>
                <dd className="text-lg font-semibold text-slate-100">
                  {phpFormat.format(totalRow.billed)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">
                  Collected
                </dt>
                <dd className="text-lg font-semibold text-emerald-300">
                  {phpFormat.format(totalRow.collected)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wide">
                  Outstanding
                </dt>
                <dd className="text-lg font-semibold text-amber-300">
                  {phpFormat.format(totalRow.outstanding)}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {/* Table */}
        {billsQuery.isLoading ? (
          <LoadingSkeleton rows={5} label="Loading bill history" />
        ) : billsQuery.error ? (
          <p
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            Failed to load bills: {String(billsQuery.error)}
          </p>
        ) : sortedBills.length === 0 ? (
          <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-6 text-center">
            No bills match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60">
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  {(
                    [
                      { key: 'period', label: 'Period', align: 'left' },
                      { key: 'tenant', label: 'Tenant', align: 'left' },
                      { key: 'total', label: 'Total', align: 'right' },
                      { key: 'status', label: 'Status', align: 'left' },
                      {
                        key: 'generated',
                        label: 'Generated',
                        align: 'left',
                        smOnly: true,
                      },
                    ] as Array<{
                      key: SortKey;
                      label: string;
                      align: 'left' | 'right';
                      smOnly?: boolean;
                    }>
                  ).map((col) => (
                    <th
                      key={col.key}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={
                        sortKey === col.key
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      onClick={() => handleSortClick(col.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSortClick(col.key);
                        }
                      }}
                      className={`py-2 px-3 cursor-pointer hover:text-slate-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                        col.align === 'right' ? 'text-right' : ''
                      } ${col.smOnly ? 'hidden sm:table-cell' : ''}`}
                    >
                      {col.label}
                      {sortIndicator(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBills.map((bill) => {
                  const isPaid = bill.status === 'paid';
                  const goToReceipt = () => navigate(`/bill/${bill.id}`);
                  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToReceipt();
                    }
                  };
                  return (
                    <tr
                      key={bill.id}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open receipt for ${bill.tenant.room_number} ${formatPeriodLabel(bill.period)}`}
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 cursor-pointer focus:outline-none focus:bg-slate-800/60 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                      onClick={goToReceipt}
                      onKeyDown={onRowKeyDown}
                    >
                      <td className="py-2 px-3 text-slate-100 font-medium">
                        {formatPeriodLabel(bill.period)}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {bill.tenant.room_number} — {bill.tenant.name}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-100 font-semibold">
                        {phpFormat.format(Number(bill.total_amount))}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                            isPaid
                              ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
                              : 'border-amber-700/50 bg-amber-900/20 text-amber-300'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-400 hidden sm:table-cell">
                        {dateFormat.format(new Date(bill.generated_at))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
