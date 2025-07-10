import { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TikTokVideo, ProcessingStep } from '@/lib/types/automation';
import { tiktokService } from '@/lib/services/tiktok-service';
import { gofileService } from '@/lib/services/gofile-service';
import { ProcessingLogs, LogEntry, DelayCountdown } from './ProcessingLogs';

interface VideoProcessorProps {
  videos: TikTokVideo[];
  onProcessingComplete: (processedVideos: TikTokVideo[]) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

interface VideoProcessingState {
  videoId: string;
  status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'error' | 'waiting';
  progress: number;
  error?: string;
  downloadUrl?: string;
  gofileUrl?: string;
  startTime?: Date;
  downloadSpeed?: string;
  fileSize?: string;
}

export function VideoProcessor({
  videos,
  onProcessingComplete,
  isProcessing,
  onProcessingChange
}: VideoProcessorProps) {
  const [processingState, setProcessingState] = useState<Map<string, VideoProcessingState>>(new Map());
  const [currentStep, setCurrentStep] = useState<ProcessingStep | null>(null);
  const [retryCount, setRetryCount] = useState<Map<string, number>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [delayCountdown, setDelayCountdown] = useState<number>(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const { toast } = useToast();

  // Initialize processing state for videos
  useEffect(() => {
    const newState = new Map<string, VideoProcessingState>();
    videos.forEach(video => {
      newState.set(video.id, {
        videoId: video.id,
        status: 'pending',
        progress: 0
      });
    });
    setProcessingState(newState);
  }, [videos]);

  const addLog = useCallback((level: LogEntry['level'], message: string, details?: string, videoId?: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      details,
      videoId
    };
    setLogs(prev => [...prev, newLog]);
    console.log(`[${level.toUpperCase()}] ${message}${details ? ` - ${details}` : ''}`);
  }, []);

  const updateVideoState = useCallback((videoId: string, updates: Partial<VideoProcessingState>) => {
    setProcessingState(prev => {
      const newState = new Map(prev);
      const current = newState.get(videoId);
      if (current) {
        newState.set(videoId, { ...current, ...updates });
      }
      return newState;
    });
  }, []);

  const startDelayCountdown = useCallback((seconds: number, videoId: string) => {
    setDelayCountdown(seconds);
    addLog('info', `Iniciando delay de ${seconds}s antes do próximo download`, `Rate limiting obrigatório`, videoId);
    
    const interval = setInterval(() => {
      setDelayCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          addLog('info', 'Delay concluído, iniciando download', undefined, videoId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return interval;
  }, [addLog]);

  const processVideo = useCallback(async (video: TikTokVideo, videoIndex: number, maxRetries = 3): Promise<boolean> => {
    const videoId = video.id;
    const startTime = new Date();
    
    addLog('info', `Iniciando processamento do vídeo ${videoIndex + 1}/${videos.length}`, `@${video.author} - ${video.description.substring(0, 50)}...`, videoId);

    try {
      updateVideoState(videoId, { 
        status: 'downloading', 
        progress: 5,
        startTime
      });

      // Step 1: Download from TikTok via ssstik.io
      setCurrentStep({
        id: `download_${videoId}`,
        name: `Baixando ${video.author} (${videoIndex + 1}/${videos.length})`,
        status: 'processing',
        progress: 10,
        timestamp: new Date()
      });

      addLog('info', 'Iniciando download do TikTok', `Usando ssstik.io para ${video.url}`, videoId);
      updateVideoState(videoId, { progress: 10 });

      const downloadResponse = await tiktokService.downloadVideo(video);
      
      if (!downloadResponse.success) {
        throw new Error(downloadResponse.error || 'Falha no download');
      }

      const downloadTime = new Date().getTime() - startTime.getTime();
      addLog('success', 'Download concluído com sucesso', `Tempo: ${(downloadTime/1000).toFixed(1)}s`, videoId);

      updateVideoState(videoId, { 
        progress: 50, 
        downloadUrl: downloadResponse.data
      });

      // Step 2: Upload to Gofile
      updateVideoState(videoId, { status: 'uploading', progress: 60 });
      setCurrentStep({
        id: `upload_${videoId}`,
        name: `Enviando para Gofile (${videoIndex + 1}/${videos.length})`,
        status: 'processing',
        progress: 60,
        timestamp: new Date()
      });

      const fileName = `${video.id}_${video.author.replace('@', '')}.mp4`;
      addLog('info', 'Iniciando upload para Gofile', `Arquivo: ${fileName}`, videoId);
      
      const uploadResponse = await gofileService.uploadFile(
        downloadResponse.data!,
        fileName
      );

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Falha no upload');
      }

      const totalTime = new Date().getTime() - startTime.getTime();
      addLog('success', 'Upload concluído com sucesso', `Tempo total: ${(totalTime/1000).toFixed(1)}s`, videoId);

      updateVideoState(videoId, {
        status: 'completed',
        progress: 100,
        gofileUrl: uploadResponse.data?.downloadPage
      });

      setCurrentStep({
        id: `complete_${videoId}`,
        name: `Vídeo ${videoIndex + 1}/${videos.length} processado`,
        status: 'completed',
        progress: 100,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLog('error', 'Erro durante processamento', errorMessage, videoId);

      const currentRetries = retryCount.get(videoId) || 0;
      
      if (currentRetries < maxRetries) {
        setRetryCount(prev => new Map(prev).set(videoId, currentRetries + 1));
        
        addLog('warning', `Tentativa de retry ${currentRetries + 1}/${maxRetries}`, `Aguardando ${(currentRetries + 1) * 2}s`, videoId);
        
        toast({
          title: "Tentativa de Retry",
          description: `Tentando novamente (${currentRetries + 1}/${maxRetries})`,
          variant: "default"
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (currentRetries + 1)));
        return await processVideo(video, videoIndex, maxRetries);
      }

      updateVideoState(videoId, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      setCurrentStep({
        id: `error_${videoId}`,
        name: `Erro no vídeo ${videoIndex + 1}/${videos.length}`,
        status: 'error',
        error: errorMessage,
        timestamp: new Date()
      });

      return false;
    }
  }, [updateVideoState, retryCount, toast, addLog, videos.length]);

  const startProcessing = useCallback(async () => {
    if (videos.length === 0) {
      toast({
        title: "Nenhum Vídeo",
        description: "Colete vídeos antes de processar",
        variant: "destructive"
      });
      return;
    }

    // Clear previous logs and reset state
    setLogs([]);
    setCurrentVideoIndex(0);
    onProcessingChange(true);
    
    addLog('info', `Iniciando processamento em lote`, `${videos.length} vídeos na fila`);

    try {
      const processedVideos: TikTokVideo[] = [];
      
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setCurrentVideoIndex(i);
        
        // Add delay countdown before each download (except the first one)
        if (i > 0) {
          updateVideoState(video.id, { status: 'waiting', progress: 0 });
          addLog('info', `Aguardando delay obrigatório antes do vídeo ${i + 1}`, 'Rate limiting para evitar bloqueios');
          
          const countdownInterval = startDelayCountdown(60, video.id);
          
          // Wait for countdown to finish
          await new Promise<void>(resolve => {
            const checkCountdown = setInterval(() => {
              if (delayCountdown <= 1) {
                clearInterval(checkCountdown);
                clearInterval(countdownInterval);
                resolve();
              }
            }, 100);
          });
        }
        
        const success = await processVideo(video, i);
        
        if (success) {
          const state = processingState.get(video.id);
          processedVideos.push({
            ...video,
            downloadUrl: state?.gofileUrl
          });
        }
      }

      onProcessingComplete(processedVideos);
      
      const successCount = processedVideos.length;
      const errorCount = videos.length - successCount;

      addLog('success', 'Processamento em lote concluído', `${successCount} sucessos, ${errorCount} erros`);

      toast({
        title: "Processamento Concluído",
        description: `${successCount} vídeos processados, ${errorCount} erros`,
        variant: successCount > 0 ? "default" : "destructive"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no processamento em lote';
      addLog('error', 'Erro crítico no processamento', errorMessage);
      
      toast({
        title: "Erro no Processamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      onProcessingChange(false);
      setCurrentStep(null);
      setDelayCountdown(0);
      setCurrentVideoIndex(0);
    }
  }, [videos, processVideo, onProcessingChange, onProcessingComplete, processingState, toast, addLog, startDelayCountdown, delayCountdown]);

  const getOverallProgress = () => {
    if (videos.length === 0) return 0;
    
    const totalProgress = Array.from(processingState.values())
      .reduce((sum, state) => sum + state.progress, 0);
    
    return Math.round(totalProgress / videos.length);
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, processing: 0, completed: 0, error: 0, waiting: 0 };
    
    processingState.forEach(state => {
      if (state.status === 'downloading' || state.status === 'uploading') {
        counts.processing++;
      } else {
        counts[state.status]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const overallProgress = getOverallProgress();

  return (
    <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md shadow-glass animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Processador de Vídeos</CardTitle>
            <CardDescription>Download via ssstik.io e upload para Gofile</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">Pendente: {statusCounts.pending}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Aguardando: {statusCounts.waiting}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-xs">Processando: {statusCounts.processing}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-xs">Concluído: {statusCounts.completed}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs">Erro: {statusCounts.error}</span>
          </div>
        </div>

        {/* Delay Countdown */}
        {delayCountdown > 0 && (
          <DelayCountdown remainingSeconds={delayCountdown} />
        )}

        {/* Current Step */}
        {currentStep && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">{currentStep.name}</span>
            </div>
            {currentStep.progress && (
              <Progress value={currentStep.progress} className="mt-2 h-1" />
            )}
          </div>
        )}

        {/* Processing Logs */}
        <ProcessingLogs logs={logs} />

        {/* Video List */}
        {videos.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium">Vídeos ({videos.length})</h4>
            {videos.map((video) => {
              const state = processingState.get(video.id);
              return (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-2 rounded bg-background/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{video.author}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {video.description.substring(0, 50)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state && (
                      <>
                        <Badge
                          variant={
                            state.status === 'completed' ? 'default' :
                            state.status === 'error' ? 'destructive' :
                            state.status === 'waiting' ? 'outline' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {state.status === 'downloading' ? 'Download' :
                           state.status === 'uploading' ? 'Upload' :
                           state.status === 'completed' ? 'OK' :
                           state.status === 'error' ? 'Erro' :
                           state.status === 'waiting' ? 'Aguardando' : 'Pendente'}
                        </Badge>
                        {state.gofileUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(state.gofileUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={startProcessing}
          disabled={isProcessing || videos.length === 0}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
        >
          {isProcessing ? (
            <>
              <div className="animate-processing mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Processando Vídeos...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Processar {videos.length} Vídeos
            </>
          )}
        </Button>

        {/* Service Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <span>• Download: ssstik.io (sem marca d'água)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>• Armazenamento: Gofile (temporário)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>• Rate limit: respeitado automaticamente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}