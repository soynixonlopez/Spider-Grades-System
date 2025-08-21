import { createBrowserRouter } from 'react-router-dom';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfessorDashboard } from './pages/ProfessorDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/professor',
    element: (
      <ProtectedRoute requiredRole="professor">
        <ProfessorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute requiredRole="student">
        <StudentDashboard />
      </ProtectedRoute>
    ),
  },
]);
