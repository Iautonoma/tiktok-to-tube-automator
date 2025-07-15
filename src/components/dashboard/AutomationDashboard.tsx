import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Activity, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TikTokCollector } from '@/components/automation/TikTokCollector';
import { VideoProcessor } from '@/components/automation/VideoProcessor';
import { YouTubeUploader } from '@/components/automation/YouTubeUploader';
import { GitHubIntegration } from '@/components/github/GitHubIntegration';
import { ServiceDiagnostics } from '@/components/automation/ServiceDiagnostics';
import { 
  TikTokVideo, 
  AutomationConfig, 
  AutomationSession, 
  ProcessingStep 
} from '@/lib/types/automation';

interface DashboardStats {
  totalVideosCollected: number;
  totalVideosProcessed: number;
  totalVideosUploaded: number;
  currentSession?: AutomationSession;
  recentSessions: AutomationSession[];
}

export function AutomationDashboard() {
  const [currentSession, setCurrentSession] = useState<AutomationSession | null>(null);
  const [collectedVideos, setCollectedVideos] = useState<TikTokVideo[]>([]);
  const [processedVideos, setProcessedVideos] = useState<TikTokVideo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalVideosCollected: 0,
    totalVideosProcessed: 0,
    totalVideosUploaded: 0,
    recentSessions: []
  });
  
  const [config, setConfig] = useState<AutomationConfig>({
    keyword: '',
    videoCount: 10,
    youtubeChannel: {
      title: '',
      description: 'Conteúdo viral do TikTok trazido para o YouTube!',
      tags: ['tiktok', 'viral', 'trending'],
      category: 'Entertainment',
      privacy: 'public'
    },
    filters: {
      minDuration: 15,
      maxDuration: 60,
      excludeKeywords: ['spam', 'nsfw']
    }
  });

  const { toast } = useToast();

  // Initialize new session
  const initializeSession = useCallback(() => {
    const session: AutomationSession = {
      id: `session_${Date.now()}`,
      config: { ...config },
      steps: [
        { id: 'collect', name: 'Coletar Vídeos', status: 'pending' },
        { id: 'process', name: 'Processar Vídeos', status: 'pending' },
        { id: 'upload', name: 'Upload YouTube', status: 'pending' }
      ],
      videos: [],
      status: 'idle',
      results: {
        videosCollected: 0,
        videosDownloaded: 0,
        videosUploaded: 0,
        errors: []
      }
    };

    setCurrentSession(session);
    console.log('[AutomationSystem] New session initialized:', session.id);
  }, [config]);

  // Update session step
  const updateSessionStep = useCallback((stepId: string, updates: Partial<ProcessingStep>) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      
      const updatedSteps = prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates, timestamp: new Date() } : step
      );

      return { ...prev, steps: updatedSteps };
    });
  }, []);

  // Handle configuration updates
  const handleConfigUpdate = useCallback((updates: Partial<AutomationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle videos collected
  const handleVideosCollected = useCallback((videos: TikTokVideo[]) => {
    setCollectedVideos(videos);
    updateSessionStep('collect', { status: 'completed', progress: 100 });
    updateSessionStep('process', { status: 'pending' });
    
    setCurrentSession(prev => prev ? {
      ...prev,
      videos,
      results: { ...prev.results, videosCollected: videos.length }
    } : null);

    setStats(prev => ({
      ...prev,
      totalVideosCollected: prev.totalVideosCollected + videos.length
    }));

    console.log(`[AutomationSystem] ${videos.length} videos collected`);
  }, [updateSessionStep]);

  // Handle processing complete
  const handleProcessingComplete = useCallback((videos: TikTokVideo[]) => {
    setProcessedVideos(videos);
    updateSessionStep('process', { status: 'completed', progress: 100 });
    updateSessionStep('upload', { status: 'pending' });

    setCurrentSession(prev => prev ? {
      ...prev,
      results: { ...prev.results, videosDownloaded: videos.length }
    } : null);

    setStats(prev => ({
      ...prev,
      totalVideosProcessed: prev.totalVideosProcessed + videos.length
    }));

    console.log(`[AutomationSystem] ${videos.length} videos processed`);
  }, [updateSessionStep]);

  // Handle upload complete
  const handleUploadComplete = useCallback((results: { successful: number; failed: number }) => {
    updateSessionStep('upload', { 
      status: 'completed', 
      progress: 100,
      message: `${results.successful} sucessos, ${results.failed} falhas`
    });

    setCurrentSession(prev => prev ? {
      ...prev,
      status: 'completed',
      endTime: new Date(),
      results: { 
        ...prev.results, 
        videosUploaded: results.successful,
        errors: results.failed > 0 ? [`${results.failed} uploads falharam`] : []
      }
    } : null);

    setStats(prev => ({
      ...prev,
      totalVideosUploaded: prev.totalVideosUploaded + results.successful
    }));

    toast({
      title: "Automação Concluída",
      description: `Sessão finalizada: ${results.successful} vídeos enviados`,
    });

    console.log(`[AutomationSystem] Session completed: ${results.successful} uploads`);
  }, [updateSessionStep, toast]);

  // Start new automation session
  const startNewSession = useCallback(() => {
    setCollectedVideos([]);
    setProcessedVideos([]);
    setIsProcessing(false);
    initializeSession();
    
    toast({
      title: "Nova Sessão",
      description: "Sessão de automação iniciada",
    });
  }, [initializeSession, toast]);

  // Get overall progress
  const getOverallProgress = useCallback(() => {
    if (!currentSession) return 0;
    
    const completedSteps = currentSession.steps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / currentSession.steps.length) * 100);
  }, [currentSession]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const overallProgress = getOverallProgress();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              TikTok to YouTube
            </h1>
            <p className="text-muted-foreground">Sistema de Automação Completo</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={startNewSession}
              disabled={isProcessing}
              variant="outline"
              className="border-primary/50 hover:border-primary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Nova Sessão
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coletados</p>
                  <p className="text-2xl font-bold">{stats.totalVideosCollected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processados</p>
                  <p className="text-2xl font-bold">{stats.totalVideosProcessed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                  <p className="text-2xl font-bold">{stats.totalVideosUploaded}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{overallProgress}%</p>
                    <Progress value={overallProgress} className="w-16 h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Session Status */}
        {currentSession && (
          <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md shadow-glass">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>Sessão Atual</span>
                    <Badge variant={currentSession.status === 'completed' ? 'default' : 'secondary'}>
                      {currentSession.status === 'idle' ? 'Aguardando' :
                       currentSession.status === 'running' ? 'Executando' :
                       currentSession.status === 'completed' ? 'Concluída' : 'Erro'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>ID: {currentSession.id}</CardDescription>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {currentSession.startTime && (
                    <div>Iniciado: {currentSession.startTime.toLocaleTimeString()}</div>
                  )}
                  {currentSession.endTime && (
                    <div>Finalizado: {currentSession.endTime.toLocaleTimeString()}</div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Session Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progresso da Sessão</span>
                    <span className="text-sm text-muted-foreground">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {currentSession.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border/30"
                    >
                      <div className={`
                        p-2 rounded-full text-xs font-medium
                        ${step.status === 'completed' ? 'bg-success text-success-foreground' :
                          step.status === 'processing' ? 'bg-warning text-warning-foreground' :
                          step.status === 'error' ? 'bg-destructive text-destructive-foreground' :
                          'bg-muted text-muted-foreground'}
                      `}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{step.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {step.status === 'completed' ? 'Concluído' :
                           step.status === 'processing' ? 'Processando...' :
                           step.status === 'error' ? 'Erro' : 'Aguardando'}
                        </div>
                        {step.message && (
                          <div className="text-xs text-muted-foreground mt-1">{step.message}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Session Results */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/30">
                  <div className="text-center">
                    <div className="text-lg font-bold">{currentSession.results.videosCollected}</div>
                    <div className="text-xs text-muted-foreground">Coletados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{currentSession.results.videosDownloaded}</div>
                    <div className="text-xs text-muted-foreground">Baixados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{currentSession.results.videosUploaded}</div>
                    <div className="text-xs text-muted-foreground">Enviados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{currentSession.results.errors.length}</div>
                    <div className="text-xs text-muted-foreground">Erros</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service Diagnostics */}
        <ServiceDiagnostics />

        {/* Main Automation Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="collect" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-card/50">
                <TabsTrigger value="collect" className="data-[state=active]:bg-primary/20">
                  1. Coletar
                </TabsTrigger>
                <TabsTrigger value="process" className="data-[state=active]:bg-primary/20">
                  2. Processar
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-primary/20">
                  3. Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="collect" className="space-y-6">
                <TikTokCollector
                  onVideosCollected={handleVideosCollected}
                  config={config}
                  onConfigUpdate={handleConfigUpdate}
                  isProcessing={isProcessing}
                />
              </TabsContent>

              <TabsContent value="process" className="space-y-6">
                <VideoProcessor
                  videos={collectedVideos}
                  onProcessingComplete={handleProcessingComplete}
                  isProcessing={isProcessing}
                  onProcessingChange={setIsProcessing}
                />
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <YouTubeUploader
                  videos={processedVideos}
                  config={config}
                  onConfigUpdate={handleConfigUpdate}
                  isProcessing={isProcessing}
                  onUploadComplete={handleUploadComplete}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* GitHub Integration Sidebar */}
          <div className="space-y-6">
            <GitHubIntegration />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border/30">
          <p>Sistema de Automação TikTok → YouTube</p>
          <p>Desenvolvido com rate limiting e retry logic integrados</p>
        </div>
      </div>
    </div>
  );
}