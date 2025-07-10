import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: 'admin' | 'user' | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile(profileData);
      
      // If no role exists, create one
      if (!roleData && profileData) {
        const isAdmin = profileData.email === 'bandanascombr@gmail.com';
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: isAdmin ? 'admin' : 'user'
          });
        setUserRole(isAdmin ? 'admin' : 'user');
      } else {
        setUserRole(roleData?.role || 'user');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserRole('user'); // Default fallback
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid potential deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      // Input validation and sanitization
      if (!email || !password) {
        return { error: { message: 'Email e senha são obrigatórios' } };
      }
      
      if (password.length < 6) {
        return { error: { message: 'A senha deve ter pelo menos 6 caracteres' } };
      }
      
      // Basic email format validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Formato de email inválido' } };
      }
      
      // Sanitize full name if provided
      const sanitizedFullName = fullName ? fullName.trim().slice(0, 100) : undefined;
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: sanitizedFullName
          }
        }
      });

      // Generic error handling to prevent user enumeration
      if (error) {
        if (error.message.includes('already registered')) {
          return { error: { message: 'Este email já está em uso' } };
        }
        return { error: { message: 'Erro no cadastro. Tente novamente.' } };
      }

      return { error: null };
    } catch (error: any) {
      return { error: { message: 'Erro no cadastro. Tente novamente.' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Input validation
      if (!email || !password) {
        return { error: { message: 'Email e senha são obrigatórios' } };
      }
      
      // Basic email format validation
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Credenciais inválidas' } };
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });
      
      // Generic error handling to prevent user enumeration
      if (error) {
        return { error: { message: 'Credenciais inválidas' } };
      }
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: 'Erro no login. Tente novamente.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = () => {
    return userRole === 'admin';
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin
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