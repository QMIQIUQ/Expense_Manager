import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { PWAProvider } from './contexts/PWAContext';
import FeatureLoadBoundary from './components/common/FeatureLoadBoundary';
import CatIllustration from './components/CatIllustration';
import InlineLoading from './components/InlineLoading';

const AppLoadingFallback: React.FC = () => (
  <div className="app-startup-loading" role="status" aria-live="polite">
    <CatIllustration variant="sleep" className="app-startup-cat" />
    <InlineLoading size={36} />
    <span>Loading… / 載入中…</span>
  </div>
);

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
              <Suspense fallback={<AppLoadingFallback />}>
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
        <Suspense fallback={<AppLoadingFallback />}>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </Suspense>
      </FeatureLoadBoundary>
      <PWAInstallPrompt />
    </PWAProvider>
  );
};

export default App;
