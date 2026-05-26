import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCreateTenant,
  useSetTenantActive,
  useTenants,
  useUpdateTenant,
} from '../hooks/useTenants';
import { TenantForm } from '../components/TenantForm';
import type { Tenant, TenantInput } from '../types/db';
import { useAuth } from '../contexts/AuthContext';

const phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const phpRateFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function TenantCard({
  tenant,
  onEdit,
  onToggleActive,
}: {
  tenant: Tenant;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  return (
    <article className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 space-y-2">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {tenant.name}
          </h3>
          <p className="text-xs text-slate-400">{tenant.room_number}</p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            tenant.type === 'renter'
              ? 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300'
              : 'border-sky-700/50 bg-sky-900/20 text-sky-300'
          }`}
        >
          {tenant.type === 'renter' ? 'Renter' : 'Non-renter'}
        </span>
      </header>

      <dl className="text-sm text-slate-300 space-y-0.5">
        {tenant.type === 'renter' && (
          <>
            <div className="flex justify-between">
              <dt className="text-slate-500">Monthly rent</dt>
              <dd>{phpFormat.format(tenant.monthly_rent ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Due day</dt>
              <dd>{tenant.rent_due_day}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <dt className="text-slate-500">Electricity</dt>
          <dd>{phpRateFormat.format(tenant.electricity_per_kwh)}/kWh</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Water sub-meter</dt>
          <dd>
            {tenant.has_water ? (
              <>Yes — {phpRateFormat.format(tenant.water_per_m3 ?? 0)}/m³</>
            ) : (
              'No'
            )}
          </dd>
        </div>
        {tenant.extras_amount > 0 && (
          <div className="flex justify-between">
            <dt className="text-slate-500">Extras</dt>
            <dd className="text-right">
              {phpFormat.format(tenant.extras_amount)}
              {tenant.extras_note && (
                <span className="block text-xs text-slate-400">
                  {tenant.extras_note}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <footer className="flex gap-2 pt-2">
        <button
          onClick={onEdit}
          className="text-xs px-3 py-1 rounded border border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onToggleActive}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            tenant.active
              ? 'border-amber-700/50 text-amber-300 hover:bg-amber-900/30'
              : 'border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30'
          }`}
        >
          {tenant.active ? 'Deactivate' : 'Reactivate'}
        </button>
      </footer>
    </article>
  );
}

export default function Tenants() {
  const { user, signOut } = useAuth();
  const tenantsQuery = useTenants();
  const createMut = useCreateTenant();
  const updateMut = useUpdateTenant();
  const setActiveMut = useSetTenantActive();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);

  const tenants = tenantsQuery.data ?? [];
  const active = tenants.filter((t) => t.active);
  const inactive = tenants.filter((t) => !t.active);

  async function handleSubmit(input: TenantInput) {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...input });
    } else {
      await createMut.mutateAsync(input);
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleEdit(tenant: Tenant) {
    setEditing(tenant);
    setShowForm(true);
  }

  function handleToggleActive(tenant: Tenant) {
    setActiveMut.mutate({ id: tenant.id, active: !tenant.active });
  }

  function handleAddNew() {
    setEditing(null);
    setShowForm(true);
  }

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
            <h1 className="text-2xl font-bold">Tenants</h1>
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

        <div className="flex justify-end">
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded transition-colors"
          >
            + Add tenant
          </button>
        </div>

        {tenantsQuery.isLoading && (
          <p className="text-sm text-slate-400">Loading…</p>
        )}

        {tenantsQuery.error && (
          <div
            role="alert"
            className="text-sm text-red-300 bg-red-950/50 border border-red-900 rounded px-3 py-2"
          >
            Failed to load tenants: {String(tenantsQuery.error)}
          </div>
        )}

        {!tenantsQuery.isLoading && tenants.length === 0 && (
          <p className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-6 text-center">
            No tenants yet. Click <strong>Add tenant</strong> to start.
          </p>
        )}

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Active ({active.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {active.map((t) => (
                <TenantCard
                  key={t.id}
                  tenant={t}
                  onEdit={() => handleEdit(t)}
                  onToggleActive={() => handleToggleActive(t)}
                />
              ))}
            </div>
          </section>
        )}

        {inactive.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inactive ({inactive.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 opacity-60">
              {inactive.map((t) => (
                <TenantCard
                  key={t.id}
                  tenant={t}
                  onEdit={() => handleEdit(t)}
                  onToggleActive={() => handleToggleActive(t)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {showForm && (
        <TenantForm
          tenant={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
