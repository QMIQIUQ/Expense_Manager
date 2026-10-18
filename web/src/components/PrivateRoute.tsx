import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser } = useAuth();

  return currentUser ? <React.Fragment key={currentUser.uid}>{children}</React.Fragment> : <Navigate to="/login" />;
};

export default PrivateRoute;
