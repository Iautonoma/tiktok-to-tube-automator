import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, Settings, Shield, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AutomationDashboard } from '@/components/dashboard/AutomationDashboard';
import { AccountsManager } from '@/components/accounts/AccountsManager';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { TestingDocumentation } from '@/components/documentation/TestingDocumentation';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Redirect to auth if not logged in
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is disabled
  if (user && profile && !profile.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
            <h2 className="text-xl font-semibold text-destructive mb-2">Conta Desativada</h2>
            <p className="text-sm text-muted-foreground">
              Sua conta foi desativada. Entre em contato com o administrador para mais informações.
            </p>
          </div>
          <Button onClick={signOut} variant="outline">
            Fazer Logout
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                TikTok to YouTube
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {profile?.full_name || profile?.email || 'Usuário'}
                </span>
                {isAdmin() && (
                  <div className="flex items-center" title="Administrador">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-4' : 'grid-cols-2'} bg-card/50`}>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary/20">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-primary/20">
              Contas
            </TabsTrigger>
            {isAdmin() && (
              <TabsTrigger value="testing" className="data-[state=active]:bg-primary/20 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Como testar o sistema</span>
                <span className="sm:hidden">Testes</span>
              </TabsTrigger>
            )}
            {isAdmin() && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-primary/20">
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AutomationDashboard />
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <AccountsManager />
          </TabsContent>

          {isAdmin() && (
            <TabsContent value="testing" className="space-y-6">
              <TestingDocumentation />
            </TabsContent>
          )}

          {isAdmin() && (
            <TabsContent value="admin" className="space-y-6">
              <AdminDashboard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
