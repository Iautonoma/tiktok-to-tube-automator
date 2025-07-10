// Security Dashboard Component
// Displays security status and recent security events for admins

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react';
import { securityAudit, SecurityEvent } from '@/lib/security/audit';
import { getSecurityStatus } from '@/lib/security/environment';
import { useAuth } from '@/contexts/AuthContext';

export function SecurityDashboard() {
  const { isAdmin } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [environmentStatus, setEnvironmentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin()) {
      loadSecurityData();
    }
  }, [isAdmin]);

  const loadSecurityData = () => {
    setLoading(true);
    
    // Load recent security events
    const events = securityAudit.getRecentEvents(50);
    setSecurityEvents(events);
    
    // Load environment security status
    const envStatus = getSecurityStatus();
    setEnvironmentStatus(envStatus);
    
    setLoading(false);
  };

  const getEventSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getEventTypeIcon = (type: SecurityEvent['event_type']) => {
    switch (type) {
      case 'auth_success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'auth_failure': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'admin_action': return <Shield className="h-4 w-4 text-warning" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatEventType = (type: SecurityEvent['event_type']) => {
    const types = {
      'auth_attempt': 'Tentativa de Autenticação',
      'auth_success': 'Login Bem-sucedido',
      'auth_failure': 'Falha no Login',
      'admin_action': 'Ação Administrativa',
      'suspicious_activity': 'Atividade Suspeita',
      'rate_limit': 'Limite de Taxa Atingido',
      'validation_error': 'Erro de Validação'
    };
    return types[type] || type;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
              Você não tem permissão para acessar o painel de segurança
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Painel de Segurança</h1>
            <p className="text-muted-foreground">Monitoramento e auditoria de segurança</p>
          </div>
        </div>
        <Button onClick={loadSecurityData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Environment Security Status */}
      {environmentStatus && (
        <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status de Segurança do Ambiente
            </CardTitle>
            <CardDescription>
              Verificações de segurança da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{environmentStatus.summary.passed}</div>
                <div className="text-sm text-muted-foreground">Passou</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{environmentStatus.summary.warnings}</div>
                <div className="text-sm text-muted-foreground">Avisos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{environmentStatus.summary.failed}</div>
                <div className="text-sm text-muted-foreground">Falharam</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{environmentStatus.summary.critical}</div>
                <div className="text-sm text-muted-foreground">Críticos</div>
              </div>
            </div>

            {environmentStatus.summary.critical > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Problemas críticos de segurança detectados! Verifique as configurações do ambiente.
                </AlertDescription>
              </Alert>
            )}

            {environmentStatus.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Recomendações:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {environmentStatus.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-warning">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Events */}
      <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Eventos de Segurança Recentes
          </CardTitle>
          <CardDescription>
            Últimos {securityEvents.length} eventos de segurança registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Carregando eventos...</p>
            </div>
          ) : securityEvents.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum evento de segurança registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event, index) => (
                    <TableRow key={event.id || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventTypeIcon(event.event_type)}
                          <span className="text-sm">{formatEventType(event.event_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEventSeverityColor(event.severity) as any}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {event.user_id ? event.user_id.substring(0, 8) + '...' : 'Anônimo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {JSON.stringify(event.details)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}