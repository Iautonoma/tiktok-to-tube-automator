import { useState, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TikTokVideo, ProcessingStep } from '@/lib/types/automation';
import { tiktokService } from '@/lib/services/tiktok-service';
import { gofileService } from '@/lib/services/gofile-service';

interface VideoProcessorProps {
  videos: TikTokVideo[];
  onProcessingComplete: (processedVideos: TikTokVideo[]) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

interface VideoProcessingState {
  videoId: string;
  status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  downloadUrl?: string;
  gofileUrl?: string;
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

  const processVideo = useCallback(async (video: TikTokVideo, maxRetries = 3): Promise<boolean> => {
    const videoId = video.id;
    console.log(`[AutomationSystem] Processing video: ${videoId}`);

    try {
      // Step 1: Download from TikTok via ssstik.io
      updateVideoState(videoId, { status: 'downloading', progress: 10 });
      setCurrentStep({
        id: `download_${videoId}`,
        name: `Baixando ${video.author}`,
        status: 'processing',
        progress: 10,
        timestamp: new Date()
      });

      const downloadResponse = await tiktokService.downloadVideo(video);
      
      if (!downloadResponse.success) {
        throw new Error(downloadResponse.error || 'Falha no download');
      }

      updateVideoState(videoId, { 
        progress: 40, 
        downloadUrl: downloadResponse.data 
      });

      // Step 2: Upload to Gofile
      updateVideoState(videoId, { status: 'uploading', progress: 50 });
      setCurrentStep({
        id: `upload_${videoId}`,
        name: `Enviando para Gofile`,
        status: 'processing',
        progress: 50,
        timestamp: new Date()
      });

      const fileName = `${video.id}_${video.author.replace('@', '')}.mp4`;
      const uploadResponse = await gofileService.uploadFile(
        downloadResponse.data!,
        fileName
      );

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Falha no upload');
      }

      updateVideoState(videoId, {
        status: 'completed',
        progress: 100,
        gofileUrl: uploadResponse.data?.downloadPage
      });

      setCurrentStep({
        id: `complete_${videoId}`,
        name: `Vídeo processado`,
        status: 'completed',
        progress: 100,
        timestamp: new Date()
      });

      console.log(`[AutomationSystem] Video processed successfully: ${videoId}`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[AutomationSystem] Video processing error: ${videoId}`, errorMessage);

      const currentRetries = retryCount.get(videoId) || 0;
      
      if (currentRetries < maxRetries) {
        setRetryCount(prev => new Map(prev).set(videoId, currentRetries + 1));
        
        toast({
          title: "Tentativa de Retry",
          description: `Tentando novamente (${currentRetries + 1}/${maxRetries})`,
          variant: "default"
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (currentRetries + 1)));
        return await processVideo(video, maxRetries);
      }

      updateVideoState(videoId, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      setCurrentStep({
        id: `error_${videoId}`,
        name: `Erro no processamento`,
        status: 'error',
        error: errorMessage,
        timestamp: new Date()
      });

      return false;
    }
  }, [updateVideoState, retryCount, toast]);

  const startProcessing = useCallback(async () => {
    if (videos.length === 0) {
      toast({
        title: "Nenhum Vídeo",
        description: "Colete vídeos antes de processar",
        variant: "destructive"
      });
      return;
    }

    onProcessingChange(true);
    console.log(`[AutomationSystem] Starting batch processing of ${videos.length} videos`);

    try {
      // Process videos sequentially to avoid rate limits
      const processedVideos: TikTokVideo[] = [];
      
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const success = await processVideo(video);
        
        if (success) {
          const state = processingState.get(video.id);
          processedVideos.push({
            ...video,
            downloadUrl: state?.gofileUrl
          });
        }

        // No additional delay needed here since the 60-second delay is built into downloadVideo
        // The TikTok service already implements the required 60-second delay
      }

      onProcessingComplete(processedVideos);
      
      const successCount = processedVideos.length;
      const errorCount = videos.length - successCount;

      toast({
        title: "Processamento Concluído",
        description: `${successCount} vídeos processados, ${errorCount} erros`,
        variant: successCount > 0 ? "default" : "destructive"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no processamento em lote';
      console.error('[AutomationSystem] Batch processing error:', errorMessage);
      
      toast({
        title: "Erro no Processamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      onProcessingChange(false);
      setCurrentStep(null);
    }
  }, [videos, processVideo, onProcessingChange, onProcessingComplete, processingState, toast]);

  const getOverallProgress = () => {
    if (videos.length === 0) return 0;
    
    const totalProgress = Array.from(processingState.values())
      .reduce((sum, state) => sum + state.progress, 0);
    
    return Math.round(totalProgress / videos.length);
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, processing: 0, completed: 0, error: 0 };
    
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Pendente: {statusCounts.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Processando: {statusCounts.processing}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm">Concluído: {statusCounts.completed}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm">Erro: {statusCounts.error}</span>
          </div>
        </div>

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
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {state.status === 'downloading' ? 'Download' :
                           state.status === 'uploading' ? 'Upload' :
                           state.status === 'completed' ? 'OK' :
                           state.status === 'error' ? 'Erro' : 'Pendente'}
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