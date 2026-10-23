import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { PWAProvider } from './contexts/PWAContext';
import FeatureLoadBoundary from './components/common/FeatureLoadBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const router = createBrowserRouter(
    [
      { path: '/', element: <Login /> },
      // Redirect legacy /login URL to root (login) to avoid unmatched-route warnings
      { path: '/login', element: <Navigate to="/" replace /> },
      {
        path: '/dashboard',
        element: (
          <PrivateRoute>
            <FeatureLoadBoundary>
              <Suspense fallback={<div role="status" style={{ padding: 24 }}>Loading… / 載入中…</div>}>
                <Dashboard />
              </Suspense>
            </FeatureLoadBoundary>
          </PrivateRoute>
        ),
      },
      // Catch-all route to handle unknown paths
      { path: '*', element: <Navigate to="/" replace /> },
    ],
    {
      basename: import.meta.env.BASE_URL,
      future: { v7_relativeSplatPath: true },
    }
  );

const App: React.FC = () => {
  return (
    <PWAProvider>
      <FeatureLoadBoundary>
        <Suspense fallback={<div role="status" style={{ padding: 24 }}>Loading… / 載入中…</div>}>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </Suspense>
      </FeatureLoadBoundary>
      <PWAInstallPrompt />
    </PWAProvider>
  );
};

export default App;
