import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function useAuthRedirect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // No hacer nada mientras está cargando
    if (loading) {
      console.log('🔄 Auth still loading...');
      return;
    }

    // Si está en la página de login y ya está autenticado, redirigir
    if (location.pathname === '/' && user && profile) {
      console.log('🔄 Usuario ya autenticado, redirigiendo desde login...');
      switch (profile.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'professor':
          navigate('/professor', { replace: true });
          break;
        case 'student':
          navigate('/student', { replace: true });
          break;
        default:
          console.error('❌ Rol desconocido:', profile.role);
      }
    }

    // Si no está autenticado y no está en login, redirigir al login
    if (!user && location.pathname !== '/') {
      console.log('🔄 Usuario no autenticado, redirigiendo a login...');
      navigate('/', { replace: true });
    }
  }, [user, profile, loading, navigate, location.pathname]);

  return { user, profile, loading };
}
