import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAllRates, useAddRate, useCurrentRate } from '../hooks/useRates';
import { isValid, validateRate } from '../lib/validation';
import type { RateInput } from '../types/db';
import { useAuth } from '../contexts/AuthContext';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Rates() {
  const { user, signOut } = useAuth();
  const currentRate = useCurrentRate();
  const allRates = useAllRates();
  const addRate = useAddRate();

  const [showForm, setShowForm] = useState(false);
  const [input, setInput] = useState<RateInput>({
    effective_date: todayIso(),
    electricity_per_kwh: 12.5,
    water_per_m3: 30,
    notes: null,
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = validateRate(input);
  const canSubmit = isValid(errors) && !addRate.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setServerError(null);
    try {
      await addRate.mutateAsync(input);
      setShowForm(false);
      setInput({
        effective_date: todayIso(),
        electricity_per_kwh: 12.5,
        water_per_m3: 30,
        notes: null,
      });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err));
    }
  }

  const rates = allRates.data ?? [];
  const current = currentRate.data;

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
            <h1 className="text-2xl font-bold">Rates</h1>
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

        {/* Current rate card */}
        <section
          className="border border-slate-700 bg-slate-800/40 rounded-lg p-6 space-y-3"
          aria-labelledby="current-rate-heading"
        >
          <h2
            id="current-rate-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-400"
          >
            Current rate
          </h2>
          {currentRate.isLoading && (
            <p className="text-sm text-slate-400">Loading…</p>
          )}
          {currentRate.error && (
            <p
              role="alert"
              className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
            >
              Failed to load current rate: {String(currentRate.error)}
            </p>
          )}
          {!currentRate.isLoading && !current && (
            <p className="text-slate-500 text-sm">
              No rate set yet. Add one below.
            </p>
          )}
          {current && (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Electricity</dt>
              <dd className="text-slate-100">
                {phpFormat.format(current.electricity_per_kwh)}/kWh
              </dd>
              <dt className="text-slate-500">Water</dt>
              <dd className="text-slate-100">
                {phpFormat.format(current.water_per_m3)}/m³
              </dd>
              <dt className="text-slate-500">Effective from</dt>
              <dd className="text-slate-100">{current.effective_date}</dd>
              {current.notes && (
                <>
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="text-slate-100">{current.notes}</dd>
                </>
              )}
            </dl>
          )}
        </section>

        {/* Add new rate */}
        {!showForm ? (
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded transition-colors"
            >
              + Add new rate
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="border border-slate-700 bg-slate-800/40 rounded-lg p-6 space-y-4"
            aria-label="Add new rate"
          >
            <h2 className="text-base font-semibold">Add new rate</h2>

            <div className="space-y-1">
              <label
                htmlFor="effective_date"
                className="block text-sm text-slate-300"
              >
                Effective from
              </label>
              <input
                id="effective_date"
                type="date"
                value={input.effective_date}
                onChange={(e) =>
                  setInput({ ...input, effective_date: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
              {errors.effective_date && (
                <p className="text-xs text-red-300">{errors.effective_date}</p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="electricity_per_kwh"
                className="block text-sm text-slate-300"
              >
                Electricity rate (₱/kWh)
              </label>
              <input
                id="electricity_per_kwh"
                type="number"
                step="0.0001"
                min="0"
                value={input.electricity_per_kwh}
                onChange={(e) =>
                  setInput({
                    ...input,
                    electricity_per_kwh: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                inputMode="decimal"
              />
              {errors.electricity_per_kwh && (
                <p className="text-xs text-red-300">
                  {errors.electricity_per_kwh}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="water_per_m3"
                className="block text-sm text-slate-300"
              >
                Water rate (₱/m³)
              </label>
              <input
                id="water_per_m3"
                type="number"
                step="0.0001"
                min="0"
                value={input.water_per_m3}
                onChange={(e) =>
                  setInput({ ...input, water_per_m3: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                inputMode="decimal"
              />
              {errors.water_per_m3 && (
                <p className="text-xs text-red-300">{errors.water_per_m3}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="notes" className="block text-sm text-slate-300">
                Notes (optional)
              </label>
              <input
                id="notes"
                type="text"
                value={input.notes ?? ''}
                onChange={(e) =>
                  setInput({ ...input, notes: e.target.value || null })
                }
                placeholder="e.g. Meralco rate adjustment Jun 2026"
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>

            {serverError && (
              <div
                role="alert"
                className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
              >
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setServerError(null);
                }}
                className="px-4 py-2 text-slate-300 hover:text-slate-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {addRate.isPending ? 'Saving…' : 'Save rate'}
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {rates.length > 0 && (
          <section
            className="border border-slate-700 bg-slate-800/40 rounded-lg p-6 space-y-3"
            aria-labelledby="history-heading"
          >
            <h2
              id="history-heading"
              className="text-sm font-semibold uppercase tracking-wide text-slate-400"
            >
              History ({rates.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-700">
                    <th className="py-2">Effective from</th>
                    <th className="py-2">Electricity</th>
                    <th className="py-2">Water</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="py-2">{r.effective_date}</td>
                      <td className="py-2">
                        {phpFormat.format(r.electricity_per_kwh)}/kWh
                      </td>
                      <td className="py-2">
                        {phpFormat.format(r.water_per_m3)}/m³
                      </td>
                      <td className="py-2 text-slate-400">{r.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Rates are append-only. To change pricing, add a new rate with a
              future effective date — old bills keep their original rate.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
