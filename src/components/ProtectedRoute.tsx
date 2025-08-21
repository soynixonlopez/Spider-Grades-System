import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'professor' | 'student';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Verificando autenticación..." />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  if (profile.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
