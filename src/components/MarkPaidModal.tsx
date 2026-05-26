import { useState, type FormEvent } from 'react';

interface Props {
  /** Tenant + period info shown for confirmation. */
  title: string;
  subtitle?: string;
  /** Called when the user submits. Component manages `paid_date` + `paid_note` locally. */
  onConfirm: (args: { paid_date: string; paid_note: string | null }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function todayIsoInManila(): string {
  // 'en-CA' + Asia/Manila gives 'YYYY-MM-DD' directly without locale-dependent
  // parsing. Matches the rest of the app's TZ stance (TC-9).
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

export function MarkPaidModal({
  title,
  subtitle,
  onConfirm,
  onCancel,
  isSubmitting,
}: Props) {
  const [paidDate, setPaidDate] = useState<string>(() => todayIsoInManila());
  const [paidNote, setPaidNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(paidDate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dateValid) {
      setError('Paid date must be YYYY-MM-DD');
      return;
    }
    setError(null);
    try {
      await onConfirm({
        paid_date: paidDate,
        paid_note: paidNote.trim() ? paidNote.trim() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4 py-8 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-paid-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full space-y-4 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-2xl"
      >
        <header>
          <h2
            id="mark-paid-title"
            className="text-lg font-bold text-slate-100"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </header>

        <div className="space-y-1">
          <label htmlFor="paid_date" className="block text-sm text-slate-300">
            Paid date
          </label>
          <input
            id="paid_date"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="paid_note" className="block text-sm text-slate-300">
            Note (optional)
          </label>
          <input
            id="paid_note"
            type="text"
            value={paidNote}
            onChange={(e) => setPaidNote(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. cash, partial via GCash"
            className="w-full px-3 py-2 bg-slate-700 text-slate-100 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 disabled:opacity-50"
            autoComplete="off"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-300 hover:text-slate-100 rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!dateValid || isSubmitting}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Mark paid'}
          </button>
        </div>
      </form>
    </div>
  );
}
