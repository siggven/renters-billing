import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenants } from '../hooks/useTenants';
import { useBillsHistory, type BillWithTenant } from '../hooks/useBills';
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
  const { user, signOut } = useAuth();
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
    <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <nav className="text-xs text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-300">
                ← Dashboard
              </Link>
            </nav>
            <h1 className="text-2xl font-bold">History</h1>
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
          <p className="text-sm text-slate-400">Loading…</p>
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
                  <th
                    onClick={() => handleSortClick('period')}
                    className="py-2 px-3 cursor-pointer hover:text-slate-200 select-none"
                  >
                    Period{sortIndicator('period')}
                  </th>
                  <th
                    onClick={() => handleSortClick('tenant')}
                    className="py-2 px-3 cursor-pointer hover:text-slate-200 select-none"
                  >
                    Tenant{sortIndicator('tenant')}
                  </th>
                  <th
                    onClick={() => handleSortClick('total')}
                    className="py-2 px-3 cursor-pointer hover:text-slate-200 select-none text-right"
                  >
                    Total{sortIndicator('total')}
                  </th>
                  <th
                    onClick={() => handleSortClick('status')}
                    className="py-2 px-3 cursor-pointer hover:text-slate-200 select-none"
                  >
                    Status{sortIndicator('status')}
                  </th>
                  <th
                    onClick={() => handleSortClick('generated')}
                    className="py-2 px-3 cursor-pointer hover:text-slate-200 select-none hidden sm:table-cell"
                  >
                    Generated{sortIndicator('generated')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBills.map((bill) => {
                  const isPaid = bill.status === 'paid';
                  return (
                    <tr
                      key={bill.id}
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => navigate(`/bill/${bill.id}`)}
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
      </div>
    </div>
  );
}
