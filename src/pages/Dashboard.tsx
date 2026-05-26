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

        <section className="border border-slate-700 bg-slate-800/40 rounded-lg p-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/50 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300">
            <span
              className="inline-block size-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            T2 — auth wired
          </div>
          <h2 className="text-lg font-semibold">Coming next</h2>
          <ul className="text-sm text-slate-400 space-y-1 list-disc pl-5">
            <li>T3 — database schema + Row Level Security</li>
            <li>T4 — tenants management</li>
            <li>T5 — rates + billing calculator</li>
            <li>T6 — meter readings entry</li>
            <li>T7 — bill generation</li>
          </ul>
          <p className="text-xs text-slate-500 pt-2">
            See PLAN.md for full progress · docs/SPEC.md for requirements.
          </p>
        </section>
      </div>
    </div>
  );
}
