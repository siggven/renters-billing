function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl">🏠</div>
        <h1 className="text-4xl font-bold tracking-tight">BahayBills</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Renters billing for a small property. Coming online task by task.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-300">
          <span
            className="inline-block size-2 rounded-full bg-emerald-400"
            aria-hidden="true"
          />
          T1 — scaffold deployed
        </div>
        <p className="text-xs text-slate-500 pt-4">
          See PLAN.md for progress · docs/SPEC.md for requirements
        </p>
      </div>
    </div>
  );
}

export default App;
