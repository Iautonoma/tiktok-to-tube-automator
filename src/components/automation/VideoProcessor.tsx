import React from 'react';
import { Download, Upload, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TikTokVideo } from '@/lib/types/automation';
import { ProcessingLogs, DelayCountdown } from './ProcessingLogs';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';

interface VideoProcessorProps {
  videos: TikTokVideo[];
  onProcessingComplete: (processedVideos: TikTokVideo[]) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

export function VideoProcessor({
  videos,
  onProcessingComplete,
  isProcessing,
  onProcessingChange
}: VideoProcessorProps) {
  const {
    processingState,
    currentStep,
    delayCountdown,
    currentVideoIndex,
    isProcessing: processingInProgress,
    processVideos,
    getOverallProgress,
    getStatusCounts
  } = useVideoProcessor();

  // Handle start processing
  const handleStartProcessing = () => {
    onProcessingChange(true);
    processVideos(videos, onProcessingComplete);
  };

  const statusCounts = getStatusCounts();
  const overallProgress = getOverallProgress(videos);

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
        <ProcessingLogs />

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
          onClick={handleStartProcessing}
          disabled={isProcessing || processingInProgress || videos.length === 0}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
        >
          {isProcessing || processingInProgress ? (
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