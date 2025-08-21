import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { BookOpen, GraduationCap, User, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  passcode: z.string().min(1, 'El passcode es requerido'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const adminCodeSchema = z.object({
  adminCode: z.string().min(1, 'Código requerido'),
});

type AdminCodeFormData = z.infer<typeof adminCodeSchema>;

export function Login() {
  const { signIn, user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'professor' | 'student'>('professor');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const adminCodeForm = useForm<AdminCodeFormData>({
    resolver: zodResolver(adminCodeSchema),
  });

  // Auto-navigate when user is authenticated
  useEffect(() => {
    console.log('Login useEffect - loading:', loading, 'user:', user?.id, 'profile:', profile?.role);
    if (!loading && user && profile) {
      console.log('User authenticated, navigating to dashboard:', profile.role);
      switch (profile.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'professor':
          navigate('/professor');
          break;
        case 'student':
          navigate('/student');
          break;
        default:
          console.error('Unknown role:', profile.role);
      }
    }
  }, [user, profile, loading, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    console.log('🔐 Login attempt with:', { email: data.email, passcode: '***' });
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.passcode);
      console.log('🔐 Login result:', { error });
      if (error) {
        console.error('❌ Login error:', error);
        toast.error('Credenciales inválidas');
      } else {
        console.log('✅ Login successful');
        toast.success('Inicio de sesión exitoso');
      }
    } catch (error) {
      console.error('❌ Login exception:', error);
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminCode = async (data: AdminCodeFormData) => {
    if (data.adminCode === 'SPIDER2025ADMIN') {
      setIsAdminMode(true);
      setShowAdminModal(false);
      adminCodeForm.reset();
      toast.success('Modo administrador activado');
    } else {
      toast.error('Código de administrador incorrecto');
    }
  };

  const handleRoleChange = (role: 'professor' | 'student') => {
    setSelectedRole(role);
    setIsAdminMode(false);
  };

  // Show loading spinner while authentication is being processed
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full border-b-2 border-primary-600 h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-600 p-3 rounded-full">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Spider Grades
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de Calificaciones
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Role Selection */}
          {!isAdminMode && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Seleccionar rol
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleChange('professor')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedRole === 'professor'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <GraduationCap className="h-6 w-6 mx-auto mb-2 text-primary-600" />
                  <span className="text-sm font-medium">Profesor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedRole === 'student'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2 text-primary-600" />
                  <span className="text-sm font-medium">Estudiante</span>
                </button>
              </div>
            </div>
          )}

          {/* Admin Mode Indicator */}
          {isAdminMode && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  Modo Administrador
                </span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...loginForm.register('email')}
                className={loginForm.formState.errors.email ? 'border-red-500' : ''}
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Passcode
              </label>
              <Input
                id="passcode"
                type="text"
                placeholder="Ingresa tu passcode"
                {...loginForm.register('passcode')}
                className={loginForm.formState.errors.passcode ? 'border-red-500' : ''}
              />
              {loginForm.formState.errors.passcode && (
                <p className="mt-1 text-sm text-red-600">
                  {loginForm.formState.errors.passcode.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          {/* Admin Access Button */}
          {!isAdminMode && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAdminModal(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Entrar como Admin
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Code Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title="Acceso de Administrador"
        size="sm"
      >
        <form onSubmit={adminCodeForm.handleSubmit(handleAdminCode)} className="space-y-4">
          <div>
            <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código Maestro
            </label>
            <Input
              id="adminCode"
              type="password"
              placeholder="Ingresa el código"
              {...adminCodeForm.register('adminCode')}
              className={adminCodeForm.formState.errors.adminCode ? 'border-red-500' : ''}
            />
            {adminCodeForm.formState.errors.adminCode && (
              <p className="mt-1 text-sm text-red-600">
                {adminCodeForm.formState.errors.adminCode.message}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdminModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Verificar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
