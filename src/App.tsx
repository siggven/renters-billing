import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Readings = lazy(() => import('./pages/Readings'));
const Bills = lazy(() => import('./pages/Bills'));
const BillView = lazy(() => import('./pages/BillView'));
const History = lazy(() => import('./pages/History'));

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-slate-400 flex items-center justify-center">
          <span className="text-sm">Loading...</span>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenants"
          element={
            <ProtectedRoute>
              <Tenants />
            </ProtectedRoute>
          }
        />
        <Route
          path="/readings"
          element={
            <ProtectedRoute>
              <Readings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bills"
          element={
            <ProtectedRoute>
              <Bills />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bill/:id"
          element={
            <ProtectedRoute>
              <BillView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        {/* Catch-all → dashboard (which itself redirects to /login if unauth) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
