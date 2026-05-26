# `supabase/`

Database migrations and (optional) seed data for the BahayBills Postgres database hosted on Supabase.

## How to apply a migration

We use the Supabase Studio web UI rather than the `supabase` CLI to keep the dependency footprint small. To apply any migration in `migrations/`:

1. Open Supabase Studio for the project:
   <https://supabase.com/dashboard/project/shqmwzbniisrdsvrefrq/sql/new>
2. Open the `.sql` file in your editor and copy its **entire contents**.
3. Paste into the Studio SQL Editor.
4. Click **Run**.
5. Confirm the success message at the bottom.

The migrations in `migrations/` are written to be **idempotent** — safe to re-run. They use `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, etc. If you re-run a migration, nothing breaks.

## Files

| File | Purpose |
| --- | --- |
| `migrations/0001_initial_schema.sql` | Creates all 5 tables (`tenants`, `rates`, `readings`, `father_water_main_readings`, `bills`) with constraints, indexes, and Row Level Security policies. **Required.** |
| `seed.sql` | Optional placeholder data (4 tenants + 1 rate) so you have something to look at after the migration. Delete and replace via the UI later. **Optional.** |

## How to verify Row Level Security is on

After running the initial schema migration, run this query in the SQL Editor:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('tenants','rates','readings','father_water_main_readings','bills');
```

All five rows should show `relrowsecurity = true`.

## How to back up

Supabase manages daily backups for you automatically (free tier: 7 days retained). For an extra ad-hoc backup, in Studio:

- **Table Editor → choose any table → ⋮ menu → "Export as CSV"**

Save the CSVs somewhere safe.

## How to roll back

The free tier doesn't support point-in-time restore. If you need to undo a schema change, write a reverse migration (`DROP TABLE …`) and apply it the same way.

For the data tables specifically, the project's free tier auto-backups can usually restore a recent snapshot — open a Supabase support ticket if you ever need that.
