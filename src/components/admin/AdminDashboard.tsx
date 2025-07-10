import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, Activity, Database, Settings, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
          role: rolesData?.find(r => r.user_id === profile.user_id)?.role || 'user',
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

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Papel do usuário atualizado para ${newRole}`,
      });

      fetchAdminData();

    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar papel do usuário",
        variant: "destructive"
      });
    }
  };

  const toggleUserEnabled = async (userId: string, enabled: boolean) => {
    try {
      const { data, error } = await supabase.rpc('set_user_enabled', {
        target_user_id: userId,
        is_enabled: enabled
      });

      if (error) throw error;

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
      // This will cascade delete profile, roles, accounts, and sessions
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

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
          <TabsList className="grid w-full grid-cols-2 bg-card/50">
            <TabsTrigger value="users">Gestão de Usuários</TabsTrigger>
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
                            <span className="text-sm">
                              {user.enabled ? 'Ativo' : 'Inativo'}
                            </span>
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
                              value={user.role}
                              onValueChange={(value: 'admin' | 'user') => 
                                updateUserRole(user.user_id, value)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
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