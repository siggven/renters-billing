import { useEffect, useState, type FormEvent } from 'react';
import type { Tenant, TenantInput, TenantType } from '../types/db';
import { isValid, validateTenant } from '../lib/validation';

interface Props {
  /** When provided, the form edits this tenant. Otherwise it creates a new one. */
  tenant?: Tenant;
  onSubmit: (input: TenantInput) => Promise<void>;
  onCancel: () => void;
}

const emptyInput: TenantInput = {
  name: '',
  room_number: '',
  type: 'renter',
  monthly_rent: 3500,
  rent_due_day: 5,
  has_water: true,
  active: true,
};

export function TenantForm({ tenant, onSubmit, onCancel }: Props) {
  const [input, setInput] = useState<TenantInput>(() =>
    tenant
      ? {
          name: tenant.name,
          room_number: tenant.room_number,
          type: tenant.type,
          monthly_rent: tenant.monthly_rent,
          rent_due_day: tenant.rent_due_day,
          has_water: tenant.has_water,
          active: tenant.active,
        }
      : emptyInput,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-clear non-renter-only fields when type flips
  useEffect(() => {
    if (input.type === 'non_renter') {
      if (input.monthly_rent !== null || input.rent_due_day !== null) {
        setInput((prev) => ({
          ...prev,
          monthly_rent: null,
          rent_due_day: null,
          has_water: false,
        }));
      }
    } else if (input.type === 'renter') {
      if (input.monthly_rent === null || input.rent_due_day === null) {
        setInput((prev) => ({
          ...prev,
          monthly_rent: prev.monthly_rent ?? 3500,
          rent_due_day: prev.rent_due_day ?? 5,
          has_water: true,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.type]);

  const errors = validateTenant(input);
  const canSubmit = isValid(errors) && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(input);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full space-y-4 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        <header>
          <h2 id="tenant-form-title" className="text-xl font-bold text-slate-100">
            {tenant ? 'Edit tenant' : 'Add tenant'}
          </h2>
        </header>

        {/* Name */}
        <div className="space-y-1">
          <label htmlFor="name" className="block text-sm text-slate-300">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
            autoComplete="off"
          />
          {errors.name && (
            <p className="text-xs text-red-300">{errors.name}</p>
          )}
        </div>

        {/* Room # */}
        <div className="space-y-1">
          <label htmlFor="room_number" className="block text-sm text-slate-300">
            Room number / label
          </label>
          <input
            id="room_number"
            type="text"
            value={input.room_number}
            onChange={(e) => setInput({ ...input, room_number: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
            placeholder="e.g. Room 1, Neighbor"
            autoComplete="off"
          />
          {errors.room_number && (
            <p className="text-xs text-red-300">{errors.room_number}</p>
          )}
        </div>

        {/* Type */}
        <fieldset className="space-y-1">
          <legend className="block text-sm text-slate-300 mb-1">Type</legend>
          <div className="flex gap-4">
            {(['renter', 'non_renter'] as TenantType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={input.type === t}
                  onChange={() => setInput({ ...input, type: t })}
                  className="accent-emerald-400"
                />
                <span className="text-slate-200">
                  {t === 'renter' ? 'Renter' : 'Non-renter'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Renter-only fields */}
        {input.type === 'renter' && (
          <>
            <div className="space-y-1">
              <label htmlFor="monthly_rent" className="block text-sm text-slate-300">
                Monthly rent (₱)
              </label>
              <input
                id="monthly_rent"
                type="number"
                step="0.01"
                min="0"
                value={input.monthly_rent ?? ''}
                onChange={(e) =>
                  setInput({
                    ...input,
                    monthly_rent: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                inputMode="decimal"
              />
              {errors.monthly_rent && (
                <p className="text-xs text-red-300">{errors.monthly_rent}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="rent_due_day" className="block text-sm text-slate-300">
                Rent due day of month (1–31)
              </label>
              <input
                id="rent_due_day"
                type="number"
                min="1"
                max="31"
                step="1"
                value={input.rent_due_day ?? ''}
                onChange={(e) =>
                  setInput({
                    ...input,
                    rent_due_day:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                inputMode="numeric"
              />
              {errors.rent_due_day && (
                <p className="text-xs text-red-300">{errors.rent_due_day}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={input.has_water}
                onChange={(e) => setInput({ ...input, has_water: e.target.checked })}
                className="accent-emerald-400"
              />
              Has water sub-meter
            </label>
          </>
        )}

        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            {serverError}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-slate-300 hover:text-slate-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
