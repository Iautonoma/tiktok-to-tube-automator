import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Github, Youtube, VideoIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectedAccount {
  id: string;
  platform: string;
  account_name: string;
  account_id?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const platformIcons = {
  tiktok: VideoIcon,
  youtube: Youtube,
  github: Github
};

const platformColors = {
  tiktok: 'text-pink-500',
  youtube: 'text-red-500',
  github: 'text-gray-700'
};

export function AccountsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'youtube' | 'github'>('tiktok');
  const [selectedAccounts, setSelectedAccounts] = useState<{[key: string]: string}>({});
  
  // Form states
  const [newAccount, setNewAccount] = useState({
    platform: 'tiktok' as 'tiktok' | 'youtube' | 'github',
    account_name: '',
    account_id: ''
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
      
      // Set default selected accounts (the active ones)
      const defaultSelected: {[key: string]: string} = {};
      data?.forEach(account => {
        if (account.is_active) {
          defaultSelected[account.platform] = account.id;
        }
      });
      setSelectedAccounts(defaultSelected);
      
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contas conectadas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    if (!newAccount.account_name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da conta é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('connected_accounts')
        .insert({
          user_id: user?.id,
          platform: newAccount.platform,
          account_name: newAccount.account_name.trim(),
          account_id: newAccount.account_id.trim() || null,
          is_active: true
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Erro",
            description: "Esta conta já está conectada",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Sucesso",
        description: `Conta ${newAccount.platform} adicionada com sucesso`,
      });

      setNewAccount({ platform: 'tiktok', account_name: '', account_id: '' });
      setIsDialogOpen(false);
      fetchAccounts();

    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar conta",
        variant: "destructive"
      });
    }
  };

  const removeAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta removida com sucesso",
      });

      fetchAccounts();

    } catch (error) {
      console.error('Error removing account:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover conta",
        variant: "destructive"
      });
    }
  };

  const switchAccount = async (platform: string, accountId: string) => {
    try {
      // Deactivate all accounts for this platform
      await supabase
        .from('connected_accounts')
        .update({ is_active: false })
        .eq('user_id', user?.id)
        .eq('platform', platform);

      // Activate selected account
      await supabase
        .from('connected_accounts')
        .update({ is_active: true })
        .eq('id', accountId);

      setSelectedAccounts(prev => ({ ...prev, [platform]: accountId }));
      
      toast({
        title: "Conta alterada",
        description: `Conta ${platform} alterada com sucesso`,
      });

      fetchAccounts();

    } catch (error) {
      console.error('Error switching account:', error);
      toast({
        title: "Erro",
        description: "Erro ao trocar conta",
        variant: "destructive"
      });
    }
  };

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, ConnectedAccount[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              Contas Conectadas
            </CardTitle>
            <CardDescription>
              Gerencie suas contas do TikTok, YouTube e GitHub
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Nova Conta</DialogTitle>
                <DialogDescription>
                  Conecte uma nova conta de plataforma para automação
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select 
                    value={newAccount.platform} 
                    onValueChange={(value: 'tiktok' | 'youtube' | 'github') => 
                      setNewAccount(prev => ({ ...prev, platform: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Nome da Conta</Label>
                  <Input
                    placeholder="@minhaconta ou nome de usuário"
                    value={newAccount.account_name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, account_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>ID da Conta (opcional)</Label>
                  <Input
                    placeholder="ID único da conta, se disponível"
                    value={newAccount.account_id}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, account_id: e.target.value }))}
                  />
                </div>
                
                <Button onClick={addAccount} className="w-full">
                  Adicionar Conta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.keys(groupedAccounts).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <VideoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta conectada</p>
            <p className="text-sm">Adicione contas para começar a usar a automação</p>
          </div>
        ) : (
          Object.entries(groupedAccounts).map(([platform, platformAccounts]) => {
            const Icon = platformIcons[platform as keyof typeof platformIcons];
            const colorClass = platformColors[platform as keyof typeof platformColors];
            
            return (
              <div key={platform} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${colorClass}`} />
                  <h3 className="font-medium capitalize">{platform}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {platformAccounts.length} conta{platformAccounts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {platformAccounts.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Conta ativa:</Label>
                      <Select
                        value={selectedAccounts[platform] || ''}
                        onValueChange={(value) => switchAccount(platform, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {platformAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    {platformAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          account.is_active 
                            ? 'bg-success/10 border-success/20' 
                            : 'bg-background/30 border-border/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {account.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{account.account_name}</p>
                            {account.account_id && (
                              <p className="text-xs text-muted-foreground">ID: {account.account_id}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {account.is_active && (
                            <Badge variant="secondary" className="bg-success/20 text-success">
                              Ativa
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAccount(account.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}