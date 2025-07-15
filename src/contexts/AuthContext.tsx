import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SecurityValidator } from '@/lib/security/validation';

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
      // Enhanced validation using SecurityValidator
      const emailValidation = SecurityValidator.validateEmail(email);
      if (!emailValidation.isValid) {
        return { error: { message: emailValidation.errors.join(', ') } };
      }

      const passwordValidation = SecurityValidator.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: { message: passwordValidation.errors.join(', ') } };
      }

      const nameValidation = fullName ? SecurityValidator.validateName(fullName) : { isValid: true, errors: [], sanitizedValue: undefined };
      if (!nameValidation.isValid) {
        return { error: { message: `Nome inválido: ${nameValidation.errors.join(', ')}` } };
      }
      
      // Use sanitized values from validation
      const sanitizedEmail = emailValidation.sanitizedValue || email.toLowerCase().trim();
      const sanitizedFullName = nameValidation.sanitizedValue;
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: sanitizedEmail,
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
      // Enhanced validation using SecurityValidator
      const emailValidation = SecurityValidator.validateEmail(email);
      if (!emailValidation.isValid) {
        return { error: { message: 'Credenciais inválidas' } };
      }

      // Basic password validation (don't expose detailed password requirements during login)
      if (!password || password.length < 1) {
        return { error: { message: 'Credenciais inválidas' } };
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitizedValue || email.toLowerCase().trim(),
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