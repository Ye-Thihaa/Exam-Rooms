import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const roleRedirects: Record<string, string> = {
      admin: '/admin',
      exam_officer: '/exam-officer',
      invigilator: '/invigilator',
      student: '/student',
    };
    return <Navigate to={roleRedirects[user.role] || '/login'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
