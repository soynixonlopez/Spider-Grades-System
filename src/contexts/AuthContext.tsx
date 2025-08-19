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

    // Timeout para evitar que se quede atascado en loading
    const timeout = setTimeout(() => {
      console.log('Auth timeout - setting loading to false');
      setLoading(false);
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Para el usuario admin específico, crear perfil temporal inmediatamente
      if (userId === '7d541023-ecb9-4ba8-98fc-14a674783670') {
        console.log('Creating temporary admin profile for known admin user');
        const tempProfile = {
          id: userId,
          email: 'admin@motta.superate.org.pa',
          role: 'admin' as const,
          passcode: 'admin123',
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passcode,
    });
    return { error };
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
