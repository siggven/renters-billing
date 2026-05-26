import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BahayBills</h1>
            <p className="text-sm text-slate-400 break-all">
              Signed in as{' '}
              <span className="text-slate-300">{user?.email}</span>
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline whitespace-nowrap"
          >
            Sign out
          </button>
        </header>

        <nav className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/tenants"
            className="border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg p-4 transition-colors"
          >
            <h2 className="text-base font-semibold text-slate-100">Tenants</h2>
            <p className="text-sm text-slate-400 mt-1">
              Add, edit, and deactivate the people you bill. Per-tenant rates
              and any extras (wifi, etc.) live on each tenant.
            </p>
          </Link>
          <Link
            to="/readings"
            className="border border-slate-700 bg-slate-800/40 hover:bg-slate-800/80 rounded-lg p-4 transition-colors"
          >
            <h2 className="text-base font-semibold text-slate-100">
              Meter readings
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter monthly electricity + water readings for each tenant and
              for father&apos;s water main. Re-saving the same month upserts.
            </p>
          </Link>
        </nav>

        <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300">
            <span
              className="inline-block size-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            T6 — meter readings entry
          </div>
          <h2 className="text-lg font-semibold">Coming next</h2>
          <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
            <li>T7 — bill generation</li>
            <li>T8 — receipt + save-as-image</li>
            <li>T9 — payment tracking</li>
            <li>T10 — dashboard summary + history</li>
          </ul>
          <p className="text-xs text-slate-500 pt-2">
            See PLAN.md for full progress · docs/SPEC.md for requirements.
          </p>
        </section>
      </div>
    </div>
  );
}
