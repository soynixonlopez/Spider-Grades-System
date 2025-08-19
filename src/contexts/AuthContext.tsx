import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Tables } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Tables<'profiles'> | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('=== FETCHING PROFILE ===');
      console.log('User ID:', userId);
      
      // Test 1: Check if we can access the profiles table at all
      console.log('Test 1: Checking profiles table access...');
      const { data: allProfiles, error: listError } = await supabase
        .from('profiles')
        .select('*');
      
      console.log('All profiles:', allProfiles);
      console.log('List error:', listError);
      
      if (listError) {
        console.error('❌ Cannot access profiles table:', listError);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Test 2: Try to get the specific profile
      console.log('Test 2: Getting specific profile...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Profile data:', data);
      console.log('Profile error:', error);

      if (error) {
        console.error('❌ Error fetching specific profile:', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        console.error('❌ No profile found for user:', userId);
        setProfile(null);
        setLoading(false);
        return;
      }

      console.log('✅ Profile fetched successfully:', data);
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('❌ Exception in fetchProfile:', error);
      setProfile(null);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
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
