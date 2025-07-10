import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Loader2, Github, Youtube, VideoIcon, AlertTriangle } from 'lucide-react';

export default function Auth() {
  const { user, signUp, signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkRateLimit, recordAttempt, getDelay, isBlocked, attempts } = useRateLimit();
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    fullName: '' 
  });

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiting
    const { allowed, waitTime } = checkRateLimit();
    if (!allowed) {
      setError(`Muitas tentativas de login. Tente novamente em ${Math.ceil(waitTime / 60)} minutos.`);
      return;
    }
    
    if (!loginForm.email || !loginForm.password) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Add progressive delay based on previous attempts
      const delay = getDelay();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const { error } = await signIn(loginForm.email, loginForm.password);
      
      if (error) {
        recordAttempt(false);
        setError(error.message || 'Credenciais inválidas');
      } else {
        recordAttempt(true);
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao sistema de automação",
        });
        navigate('/');
      }
    } catch (err) {
      recordAttempt(false);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic input validation
    if (!signupForm.email || !signupForm.password || !signupForm.confirmPassword || !signupForm.fullName) {
      setError('Por favor, preencha todos os campos');
      setIsSubmitting(false);
      return;
    }
    
    // Sanitize full name input
    const sanitizedFullName = signupForm.fullName.trim().replace(/[<>'"&]/g, '');
    if (sanitizedFullName.length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      setIsSubmitting(false);
      return;
    }

    // Validation
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('As senhas não coincidem');
      setIsSubmitting(false);
      return;
    }

    if (signupForm.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      setIsSubmitting(false);
      return;
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(signupForm.password)) {
      setError('A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await signUp(
        signupForm.email, 
        signupForm.password, 
        sanitizedFullName
      );
      
      if (error) {
        setError(error.message || 'Erro ao criar conta');
      } else {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar a conta",
        });
        // Reset form
        setSignupForm({ email: '', password: '', confirmPassword: '', fullName: '' });
        setError(null);
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <VideoIcon className="h-8 w-8 text-primary" />
            <Github className="h-6 w-6 text-muted-foreground" />
            <Youtube className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            TikTok to YouTube
          </h1>
          <p className="text-muted-foreground">Sistema de Automação Completo</p>
        </div>

        {/* Auth Forms */}
        <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md shadow-glass">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {isBlocked && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Conta temporariamente bloqueada devido a muitas tentativas de login falhadas.
                  </AlertDescription>
                </Alert>
              )}
              
              {attempts > 2 && !isBlocked && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Atenção: {attempts} tentativas de login realizadas. Restam {5 - attempts} tentativas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupForm.fullName}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Sistema seguro de automação</p>
          <p>Suas credenciais são protegidas</p>
        </div>
      </div>
    </div>
  );
}