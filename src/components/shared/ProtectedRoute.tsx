import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

if (!isAuthenticated || !user) {
  return <Navigate to="/" replace />;
}

  if (user && !allowedRoles.includes(user.role)) {
    const roleRedirects: Record<string, string> = {
      admin: '/admin',
      exam_officer: '/exam-officer',
      invigilator: '/invigilator',
      student: '/student',
    };
    return <Navigate to={roleRedirects[user.role] || '/'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;