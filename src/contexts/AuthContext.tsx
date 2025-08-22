import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Tables } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Tables<'profiles'> | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, passcode: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isProfessor: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        console.log('🔄 Inicializando autenticación...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('📱 Sesión inicial:', session ? 'Encontrada' : 'No encontrada', error);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 Usuario encontrado, cargando perfil...');
          await fetchProfile(session.user.id);
        } else {
          console.log('❌ No hay sesión activa');
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 Error inicializando auth:', error);
        setLoading(false);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Cambio de estado auth:', event, session ? 'Con sesión' : 'Sin sesión');
      
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Usuario autenticado, cargando perfil...');
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 Usuario desconectado');
        setProfile(null);
        setLoading(false);
      } else if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });

    // Initialize auth
    initializeAuth();

    // Timeout de seguridad más largo para permitir que Supabase restaure la sesión
    timeoutId = setTimeout(() => {
      console.log('⏰ Timeout de autenticación alcanzado');
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

    const fetchProfile = async (userId: string) => {
    try {
      console.log('🔄 Cargando perfil para usuario:', userId);
      
      // Obtener el perfil de la base de datos con timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Timeout de 8 segundos para la consulta
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      console.log('📋 Resultado carga perfil:', { 
        hasData: !!data, 
        role: data?.role, 
        email: data?.email, 
        error: error?.message 
      });

      if (error) {
        console.error('❌ Error cargando perfil:', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('❌ No se encontró perfil para usuario:', userId);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Perfil cargado exitosamente:', { role: data.role, email: data.email });
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('💥 Excepción cargando perfil:', error);
      setProfile(null);
      setLoading(false);
    }
  };

    const signIn = async (email: string, passcode: string) => {
    try {
      console.log('🔐 Iniciando login para:', email);
      
      // Login con timeout
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password: passcode,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 10000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Error en login:', error.message);
        return { error };
      }
      
      if (data.user) {
        console.log('✅ Login exitoso para usuario:', data.user.id);
        console.log('🔄 Perfil se cargará automáticamente...');
        // El perfil se cargará automáticamente en onAuthStateChange
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('💥 Excepción en login:', error.message);
      return { error: { message: error.message || 'Error de conexión' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin';
  const isProfessor = profile?.role === 'professor';
  const isStudent = profile?.role === 'student';

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
    isProfessor,
    isStudent,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
