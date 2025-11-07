import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import HeaderNotification from './components/HeaderNotification';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <HeaderNotification />
            <Routes>
              <Route path="/" element={<Login />} />
              {/* Redirect legacy /login URL to root (login) to avoid unmatched-route warnings */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
