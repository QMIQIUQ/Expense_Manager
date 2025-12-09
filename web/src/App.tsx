import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const App: React.FC = () => {
  const router = createBrowserRouter(
    [
      { path: '/', element: <Login /> },
      // Redirect legacy /login URL to root (login) to avoid unmatched-route warnings
      { path: '/login', element: <Navigate to="/" replace /> },
      {
        path: '/dashboard',
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
      },
    ],
    {
      basename: import.meta.env.BASE_URL,
      future: { v7_relativeSplatPath: true },
    }
  );

  return (
    <>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <PWAInstallPrompt />
    </>
  );
};

export default App;
