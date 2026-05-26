import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBillById } from '../hooks/useBill';
import { formatPeriodLabel } from '../lib/period';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

function formatGeneratedAt(iso: string): string {
  // Asia/Manila display per TC-9
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function safeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export default function BillView() {
  const { id } = useParams<{ id: string }>();
  const { signOut } = useAuth();

  const billQuery = useBillById(id);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleSaveAsImage() {
    if (!receiptRef.current || !billQuery.data) return;
    setExporting(true);
    setExportError(null);
    try {
      // Lazy-load html2canvas so the bills list page doesn't ship the ~150kB
      // gzipped library. Only the receipt view pays the cost, and only when
      // the user actually clicks "Save as image".
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        // Higher pixel ratio = sharper output on hi-DPI screens
        scale: window.devicePixelRatio > 1 ? 2 : 1,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `${safeFilename(billQuery.data.tenant.room_number)}_${billQuery.data.period}.png`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }

  if (billQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
        <p className="text-sm text-slate-400 max-w-md mx-auto">Loading…</p>
      </div>
    );
  }

  if (billQuery.error) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
        <div className="max-w-md mx-auto space-y-4">
          <Link to="/bills" className="text-xs text-slate-500 hover:text-slate-300">
            ← Bills
          </Link>
          <p
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            Failed to load bill: {String(billQuery.error)}
          </p>
        </div>
      </div>
    );
  }

  const bill = billQuery.data;
  if (!bill) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
        <div className="max-w-md mx-auto space-y-4">
          <Link to="/bills" className="text-xs text-slate-500 hover:text-slate-300">
            ← Bills
          </Link>
          <p className="text-sm text-slate-400">Bill not found.</p>
        </div>
      </div>
    );
  }

  const isPaid = bill.status === 'paid';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8">
      <style>{`
        /* Print stylesheet (FR-26): a paper-friendly fallback. Hides the
           page chrome, leaves only the receipt card on a white background. */
        @media print {
          body { background: #ffffff !important; }
          .no-print { display: none !important; }
          .receipt-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="max-w-md mx-auto space-y-4">
        {/* Page chrome — hidden in print and not screenshotted */}
        <div className="no-print flex items-center justify-between text-xs text-slate-400">
          <Link to="/bills" className="hover:text-slate-200">
            ← Bills
          </Link>
          <button
            onClick={() => signOut()}
            className="hover:text-slate-200 underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>

        {/* The receipt — uses ONLY hex colors so html2canvas can render it.
            Tailwind v4 emits oklch() for many palette tokens which html2canvas
            (1.4.1) can't parse — so the receipt avoids slate-/emerald- classes
            and uses arbitrary [color:#xyz]/[bg:#xyz] utilities instead. */}
        <article
          ref={receiptRef}
          className="receipt-card bg-[#ffffff] text-[#1f2937] rounded-lg shadow-2xl p-6 space-y-4"
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}
        >
          {/* Header */}
          <header className="text-center border-b border-[#e5e7eb] pb-3">
            <h1 className="text-xl font-bold tracking-tight">BahayBills</h1>
            <p className="text-sm text-[#6b7280]">
              {formatPeriodLabel(bill.period)}
            </p>
          </header>

          {/* Tenant */}
          <section className="text-center">
            <p className="text-xs uppercase tracking-wider text-[#6b7280]">
              {bill.tenant.type === 'renter' ? 'Renter' : 'Non-renter'}
            </p>
            <h2 className="text-lg font-semibold">{bill.tenant.room_number}</h2>
            <p className="text-base">{bill.tenant.name}</p>
          </section>

          {/* Line items */}
          <section className="space-y-3 text-sm">
            {/* Electricity */}
            {bill.elec_amount != null && (
              <div className="border-t border-[#e5e7eb] pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Electricity</span>
                  <span>{phpFormat.format(Number(bill.elec_amount))}</span>
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5">
                  {bill.prev_elec != null ? Number(bill.prev_elec) : '—'} →{' '}
                  {bill.curr_elec != null ? Number(bill.curr_elec) : '—'} ={' '}
                  {bill.elec_kwh ?? 0} kWh ×{' '}
                  {phpFormat.format(Number(bill.elec_rate ?? 0))}/kWh
                </div>
              </div>
            )}

            {/* Water */}
            {bill.water_amount != null && (
              <div className="border-t border-[#e5e7eb] pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Water</span>
                  <span>{phpFormat.format(Number(bill.water_amount))}</span>
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5">
                  {bill.prev_water != null ? Number(bill.prev_water) : '—'} →{' '}
                  {bill.curr_water != null ? Number(bill.curr_water) : '—'} ={' '}
                  {bill.water_m3 ?? 0} m³ ×{' '}
                  {phpFormat.format(Number(bill.water_rate ?? 0))}/m³
                </div>
              </div>
            )}

            {/* Rent */}
            {bill.rent_amount != null && (
              <div className="border-t border-[#e5e7eb] pt-3 flex justify-between font-semibold">
                <span>Rent</span>
                <span>{phpFormat.format(Number(bill.rent_amount))}</span>
              </div>
            )}

            {/* Extras (only when amount > 0) */}
            {bill.extras_amount != null && Number(bill.extras_amount) > 0 && (
              <div className="border-t border-[#e5e7eb] pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Extras</span>
                  <span>{phpFormat.format(Number(bill.extras_amount))}</span>
                </div>
                {bill.extras_note && (
                  <div className="text-xs text-[#6b7280] mt-0.5">
                    {bill.extras_note}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Total */}
          <section className="border-t-2 border-[#1f2937] pt-3 flex justify-between text-base font-bold">
            <span>TOTAL</span>
            <span>{phpFormat.format(Number(bill.total_amount))}</span>
          </section>

          {/* Footer */}
          <footer className="border-t border-[#e5e7eb] pt-3 text-center space-y-2">
            <p className="text-xs text-[#6b7280]">
              Generated {formatGeneratedAt(bill.generated_at)}
            </p>
            {isPaid && bill.paid_date && (
              <p
                className="inline-block px-3 py-1 rounded border-2 border-[#059669] text-[#059669] font-bold text-sm tracking-wider"
                aria-label="Paid stamp"
              >
                PAID on {bill.paid_date}
              </p>
            )}
            {!isPaid && (
              <p className="text-xs text-[#6b7280]">
                Status: <span className="font-semibold">UNPAID</span>
              </p>
            )}
          </footer>
        </article>

        {/* Save / print controls — hidden when printing or screenshotting */}
        <div className="no-print flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSaveAsImage}
            disabled={exporting}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Generating image…' : 'Save as image'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={exporting}
            className="flex-1 px-4 py-2 border border-slate-600 text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            Print
          </button>
        </div>

        {exportError && (
          <p
            role="alert"
            className="no-print text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            Couldn&apos;t generate image: {exportError}
          </p>
        )}
      </div>
    </div>
  );
}
