import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { gofileService } from '@/lib/services/gofile-service';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  service: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export const ServiceDiagnostics: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    // Teste 1: Verificar informações da conta Gofile
    try {
      const start = Date.now();
      const accountInfo = await gofileService.getAccountInfo();
      const duration = Date.now() - start;
      
      if (accountInfo.success && accountInfo.data) {
        diagnostics.push({
          service: 'Gofile Account',
          status: 'success',
          message: `Conta ativa - ${Math.round(accountInfo.data.storage / 1024 / 1024)} MB usado de ${Math.round(accountInfo.data.quota / 1024 / 1024)} MB`,
          details: accountInfo.data,
          duration
        });
      } else {
        diagnostics.push({
          service: 'Gofile Account',
          status: 'error',
          message: accountInfo.error || 'Falha ao obter informações da conta',
          duration
        });
      }
    } catch (error) {
      diagnostics.push({
        service: 'Gofile Account',
        status: 'error',
        message: `Erro de conexão: ${error.message}`,
      });
    }

    // Teste 2: Criar pasta de teste no Gofile
    try {
      const start = Date.now();
      const testFolderName = `test-${Date.now()}`;
      const folder = await gofileService.createFolder(testFolderName);
      const duration = Date.now() - start;
      
      if (folder.success && folder.data) {
        diagnostics.push({
          service: 'Gofile Folder Creation',
          status: 'success',
          message: `Pasta criada com sucesso: ${testFolderName}`,
          details: { folderId: folder.data },
          duration
        });

        // Teste 3: Deletar pasta de teste
        try {
          await gofileService.deleteFile(folder.data);
          diagnostics.push({
            service: 'Gofile Folder Deletion',
            status: 'success',
            message: 'Pasta de teste removida com sucesso',
          });
        } catch (deleteError) {
          diagnostics.push({
            service: 'Gofile Folder Deletion',
            status: 'warning',
            message: `Pasta criada mas não foi possível remover: ${deleteError.message}`,
          });
        }
      } else {
        diagnostics.push({
          service: 'Gofile Folder Creation',
          status: 'error',
          message: folder.error || 'Falha ao criar pasta de teste',
          duration
        });
      }
    } catch (error) {
      diagnostics.push({
        service: 'Gofile Folder Creation',
        status: 'error',
        message: `Erro ao criar pasta: ${error.message}`,
      });
    }

    // Teste 4: Verificar TikTok Proxy
    try {
      const start = Date.now();
      const testUrl = 'https://www.tiktok.com/@test/video/123456789';
      const { data: proxyResult, error } = await supabase.functions.invoke('tiktok-proxy', {
        body: { url: testUrl }
      });
      const duration = Date.now() - start;
      
      if (error) {
        diagnostics.push({
          service: 'TikTok Proxy',
          status: 'error',
          message: `Erro do proxy: ${error.message}`,
          duration
        });
      } else if (proxyResult) {
        diagnostics.push({
          service: 'TikTok Proxy',
          status: proxyResult.success ? 'success' : 'warning',
          message: proxyResult.success ? 'Proxy funcionando' : (proxyResult.error || 'Proxy retornou erro'),
          details: proxyResult,
          duration
        });
      }
    } catch (error) {
      diagnostics.push({
        service: 'TikTok Proxy',
        status: 'error',
        message: `Erro de conexão com proxy: ${error.message}`,
      });
    }

    // Teste 5: Verificar rate limits do Gofile
    const usageStats = gofileService.getUsageStats();
    diagnostics.push({
      service: 'Gofile Rate Limits',
      status: usageStats.rateLimitCount > 90 ? 'warning' : 'success',
      message: `${usageStats.rateLimitCount}/100 requisições usadas`,
      details: usageStats
    });

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico de Serviços</CardTitle>
        <CardDescription>
          Verificar conectividade e funcionalidade dos serviços Gofile e TikTok Proxy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isRunning ? 'Executando Diagnósticos...' : 'Executar Diagnósticos'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Resultados</h3>
            {results.map((result, index) => (
              <Alert key={index} className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{result.service}</span>
                    {getStatusBadge(result.status)}
                    {result.duration && (
                      <span className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                  </div>
                  <AlertDescription className="mb-2">
                    {result.message}
                  </AlertDescription>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};