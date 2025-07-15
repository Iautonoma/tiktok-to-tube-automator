import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';
import { Users, Activity, Database, Settings, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/lib/security/audit';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  enabled: boolean;
  created_at: string;
  role?: 'admin' | 'user';
  accounts_count?: number;
  sessions_count?: number;
}

interface AdminStats {
  totalUsers: number;
  totalSessions: number;
  totalAccounts: number;
  activeUsers: number;
}

export function AdminDashboard() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSessions: 0,
    totalAccounts: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin()) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      // Use the simplified view for better performance
      const { data: usersData, error: usersError } = await supabase
        .from('admin_user_overview')
        .select('*');

      if (usersError) {
        console.error('Error fetching users from view:', usersError);
        // Fallback to direct queries
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Get roles separately
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role');

        // Combine data manually
        const usersWithRoles = profilesData?.map(profile => ({
          ...profile,
          role: (rolesData?.find(r => r.user_id === profile.user_id)?.role || 'user') as 'admin' | 'user',
          accounts_count: 0,
          sessions_count: 0
        })) || [];

        setUsers(usersWithRoles);
      } else {
        setUsers(usersData || []);
      }

      // Calculate stats with simple counts
      const { count: accountsCount } = await supabase
        .from('connected_accounts')
        .select('*', { count: 'exact', head: true });

      const { count: sessionsCount } = await supabase
        .from('automation_sessions')
        .select('*', { count: 'exact', head: true });

      const totalUsers = usersData?.length || 0;
      const activeUsers = usersData?.filter(u => u.accounts_count > 0).length || 0;

      setStats({
        totalUsers,
        totalSessions: sessionsCount || 0,
        totalAccounts: accountsCount || 0,
        activeUsers
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados administrativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user', reason?: string) => {
    try {
      setLoading(true);
      
      // Use secure database function instead of direct update
      const { error } = await supabase.rpc('update_user_role_secure', {
        target_user_id: userId,
        new_role: newRole,
        reason: reason || 'Role updated via admin dashboard'
      });
      
      if (error) {
        // Handle specific security violations with user-friendly messages
        if (error.message.includes('Security violation')) {
          toast({
            title: "🚫 Acesso Negado",
            description: "Não é possível modificar sua própria função por segurança",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('main administrator')) {
          toast({
            title: "🔒 Operação Não Permitida",
            description: "Não é possível modificar a função do administrador principal",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }
      
      // Enhanced success message with security information
      toast({
        title: "✅ Função Atualizada com Segurança",
        description: `Usuário agora é ${newRole === 'admin' ? 'administrador' : 'usuário'}. Alteração registrada no log de auditoria.`,
      });
      
      await fetchAdminData();
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({
        title: "⚠️ Erro de Segurança",
        description: error instanceof Error ? error.message : "Falha ao atualizar função do usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserEnabled = async (userId: string, enabled: boolean) => {
    try {
      const { data, error } = await supabase.rpc('set_user_enabled', {
        target_user_id: userId,
        is_enabled: enabled
      });

      if (error) throw error;

      // Log security event
      logAdminAction(
        userId, 
        enabled ? 'enable_user' : 'disable_user', 
        userId,
        { enabled, userEmail: users.find(u => u.user_id === userId)?.email }
      );

      toast({
        title: "Sucesso",
        description: `Usuário ${enabled ? 'habilitado' : 'desabilitado'} com sucesso`,
      });

      fetchAdminData();

    } catch (error) {
      console.error('Error toggling user enabled:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status do usuário",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const userToDelete = users.find(u => u.user_id === userId);
      
      // This will cascade delete profile, roles, accounts, and sessions
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      // Log critical security event
      logAdminAction(
        userId, 
        'delete_user', 
        userId,
        { userEmail: userToDelete?.email, deletedAt: new Date().toISOString() }
      );

      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso",
      });

      fetchAdminData();

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta área
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gestão de usuários e sistema</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usuários</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Activity className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Database className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Conectadas</p>
                  <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/20">
                  <Settings className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sessões</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Interface */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="users">Gestão de Usuários</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
                <CardDescription>
                  Gerencie usuários, papéis e permissões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Contas</TableHead>
                      <TableHead>Sessões</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.enabled}
                              onCheckedChange={(enabled) => toggleUserEnabled(user.user_id, enabled)}
                              disabled={user.email === 'bandanascombr@gmail.com'}
                            />
                            <Badge 
                              variant={user.enabled ? "default" : "destructive"}
                              className={user.enabled ? 'bg-success/20 text-success border-success/20' : 'bg-destructive/20 text-destructive border-destructive/20'}
                            >
                              {user.enabled ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={user.role === 'admin' ? 'bg-primary/20 text-primary' : ''}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Usuário'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.accounts_count || 0}</TableCell>
                        <TableCell>{user.sessions_count || 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.role || 'user'}
                              onValueChange={(value: 'admin' | 'user') => 
                                updateUserRole(user.user_id, value)
                              }
                            >
                              <SelectTrigger className="w-28 bg-background border-border">
                                <SelectValue placeholder="Selecionar papel" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border shadow-lg z-50">
                                <SelectItem value="user" className="hover:bg-muted focus:bg-muted">Usuário</SelectItem>
                                <SelectItem value="admin" className="hover:bg-muted focus:bg-muted">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {user.email !== 'bandanascombr@gmail.com' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteUser(user.user_id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
              <CardHeader>
                <CardTitle>Informações do Sistema</CardTitle>
                <CardDescription>
                  Status e configurações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background/30 border border-border/30">
                    <h4 className="font-medium mb-2">Base de Dados</h4>
                    <div className="space-y-1 text-sm">
                      <p>Usuários: {stats.totalUsers}</p>
                      <p>Contas conectadas: {stats.totalAccounts}</p>
                      <p>Sessões de automação: {stats.totalSessions}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-background/30 border border-border/30">
                    <h4 className="font-medium mb-2">Sistema</h4>
                    <div className="space-y-1 text-sm">
                      <p>Status: <Badge variant="secondary" className="bg-success/20 text-success">Online</Badge></p>
                      <p>Versão: 1.0.0</p>
                      <p>Ambiente: Produção</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}