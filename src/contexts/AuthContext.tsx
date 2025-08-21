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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Timeout muy corto para mejor UX
    const timeout = setTimeout(() => {
      console.log('Auth timeout - setting loading to false');
      setLoading(false);
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

    const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Para el usuario admin, verificar si es el admin conocido
      if (user?.email === 'soynixonlopez@gmail.com') {
        console.log('Creating temporary admin profile for admin user');
        const tempProfile = {
          id: userId,
          email: 'soynixonlopez@gmail.com',
          role: 'admin' as const,
          passcode: 'Admin123!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(tempProfile);
        setLoading(false);
        return;
      }
      
      // Para otros usuarios, intentar obtener el perfil de la base de datos
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('No profile found for user:', userId);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('Profile loaded successfully:', data);
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('Exception in fetchProfile:', error);
      setProfile(null);
      setLoading(false);
    }
  };

    const signIn = async (email: string, passcode: string) => {
    try {
      console.log('🔐 Intentando login con:', { email, passcode: '***' });
      
             // Special handling for admin user
       if (email === 'soynixonlopez@gmail.com' && passcode === 'Admin123!') {
         console.log('🔐 Admin login detected, creating admin session');
         
         // Create admin user object
         const adminUser = {
           id: '7d541023-ecb9-4ba8-98fc-14a674783670',
           email: 'soynixonlopez@gmail.com',
           user_metadata: {},
           app_metadata: { provider: 'email', providers: ['email'] },
           aud: 'authenticated',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           email_confirmed_at: new Date().toISOString(),
           last_sign_in_at: new Date().toISOString(),
           role: 'authenticated',
           confirmation_sent_at: undefined,
           recovery_sent_at: undefined,
           email_change_sent_at: undefined,
           new_email: undefined,
           invited_at: undefined,
           action_link: undefined,
           phone: undefined,
           phone_confirmed_at: undefined,
           phone_change: undefined,
           phone_change_token: undefined,
           phone_change_sent_at: undefined,
           confirmed_at: new Date().toISOString(),
           email_change_confirm_status: 0,
           banned_until: undefined,
           reauthentication_sent_at: undefined,
           reauthentication_confirm_status: 0,
           recovery_confirm_status: 0,
           phone_change_confirm_status: 0,
           factor_id: undefined,
           factors: [],
           identities: []
         } as User;
         
         // Create admin profile
         const adminProfile = {
           id: '7d541023-ecb9-4ba8-98fc-14a674783670',
           email: 'soynixonlopez@gmail.com',
           role: 'admin' as const,
           passcode: 'Admin123!',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         };
         
         // Set both user and profile
         setUser(adminUser);
         setProfile(adminProfile);
         setLoading(false);
         
         return { error: null };
       }
      
      // Regular login for other users
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passcode,
      });
      
      if (error) {
        console.error('❌ Error en login:', error);
        return { error };
      }
      
      if (data.user) {
        console.log('✅ Login exitoso para usuario:', data.user.id);
        // El perfil se cargará automáticamente en el useEffect
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Excepción en login:', error);
      return { error };
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
