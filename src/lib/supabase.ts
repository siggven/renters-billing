import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud at module load time. Easier to debug than a cryptic auth
  // error 30 minutes into a dev session. In production, this surfaces as
  // a hard error in the browser console with the exact missing variable.
  throw new Error(
    `Missing Supabase env vars. ` +
      `URL=${url ? 'set' : 'MISSING'} ` +
      `ANON_KEY=${anonKey ? 'set' : 'MISSING'}. ` +
      `For local dev: copy .env.example to .env.local and fill in values. ` +
      `For CI: set repo secrets VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ` +
      `(Settings → Secrets and variables → Actions).`,
  );
}

export const supabase = createClient(url, anonKey);
