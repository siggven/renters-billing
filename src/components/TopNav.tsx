import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tenants', to: '/tenants' },
  { label: 'Readings', to: '/readings' },
  { label: 'Bills', to: '/bills' },
  { label: 'History', to: '/history' },
];

/**
 * Persistent app-wide navigation. Replaces the per-page back-link + sign-out
 * chrome that every page used to render.
 *
 * Design choices:
 *  - Horizontal scroll on small viewports (`overflow-x-auto`) so all 5 links
 *    stay visible at 360px without wrapping or hiding behind a hamburger.
 *  - `NavLink` from react-router does the active-state matching. The `end`
 *    prop on Dashboard prevents it from claiming "/dashboard/foo" matches.
 *  - Sign-out is inline at the right rather than in a profile dropdown:
 *    no public signup, only two real users, so it's just one always-on button.
 */
export function TopNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        <NavLink
          to="/dashboard"
          className="text-base font-bold text-slate-100 whitespace-nowrap"
          aria-label="BahayBills home"
        >
          🏠 <span className="ml-1">BahayBills</span>
        </NavLink>
        <nav aria-label="Primary" className="flex-1 min-w-0 overflow-x-auto">
          <ul className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `inline-flex px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/40'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden sm:block text-xs text-slate-400 truncate max-w-[12rem]">
          {user?.email}
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-400 hover:text-slate-100 underline-offset-4 hover:underline whitespace-nowrap"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
