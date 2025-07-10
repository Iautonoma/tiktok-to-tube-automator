import { useState, useCallback } from 'react';
import { TikTokVideo, ProcessingStep } from '@/lib/types/automation';
import { tiktokService } from '@/lib/services/tiktok-service';
import { gofileService } from '@/lib/services/gofile-service';
import { useGlobalLogs } from '@/contexts/LogsContext';
import { useToast } from '@/hooks/use-toast';

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

export function useVideoProcessor() {
  const [processingState, setProcessingState] = useState<Map<string, VideoProcessingState>>(new Map());
  const [currentStep, setCurrentStep] = useState<ProcessingStep | null>(null);
  const [retryCount, setRetryCount] = useState<Map<string, number>>(new Map());
  const [delayCountdown, setDelayCountdown] = useState<number>(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const { addLog } = useGlobalLogs();
  const { toast } = useToast();

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

  const initializeVideos = useCallback((videos: TikTokVideo[]) => {
    const newState = new Map<string, VideoProcessingState>();
    videos.forEach(video => {
      newState.set(video.id, {
        videoId: video.id,
        status: 'pending',
        progress: 0
      });
    });
    setProcessingState(newState);
    setRetryCount(new Map());
    setCurrentVideoIndex(0);
  }, []);

  const processVideo = useCallback(async (video: TikTokVideo, videoIndex: number, totalVideos: number, maxRetries = 3): Promise<boolean> => {
    const videoId = video.id;
    const startTime = new Date();
    
    addLog('info', `Iniciando processamento do vídeo ${videoIndex + 1}/${totalVideos}`, `@${video.author} - ${video.url}`, videoId);

    try {
      updateVideoState(videoId, { 
        status: 'downloading', 
        progress: 5,
        startTime
      });

      // Step 1: Download from TikTok via ssstik.io
      setCurrentStep({
        id: `download_${videoId}`,
        name: `Baixando ${video.author} (${videoIndex + 1}/${totalVideos})`,
        status: 'processing',
        progress: 10,
        timestamp: new Date()
      });

      addLog('info', 'Iniciando download do TikTok', `Usando ssstik.io - ${video.url}`, videoId);
      updateVideoState(videoId, { progress: 10 });

      const downloadResponse = await tiktokService.downloadVideo(video);
      
      if (!downloadResponse.success) {
        const errorDetail = downloadResponse.error || 'Falha no download';
        addLog('error', 'Falha no download do TikTok', `Erro: ${errorDetail} - URL: ${video.url}`, videoId);
        throw new Error(errorDetail);
      }

      const downloadTime = new Date().getTime() - startTime.getTime();
      addLog('success', 'Download concluído com sucesso', `Tempo: ${(downloadTime/1000).toFixed(1)}s - URL baixada: ${downloadResponse.data}`, videoId);

      updateVideoState(videoId, { 
        progress: 50, 
        downloadUrl: downloadResponse.data
      });

      // Step 2: Upload to Gofile
      updateVideoState(videoId, { status: 'uploading', progress: 60 });
      setCurrentStep({
        id: `upload_${videoId}`,
        name: `Enviando para Gofile (${videoIndex + 1}/${totalVideos})`,
        status: 'processing',
        progress: 60,
        timestamp: new Date()
      });

      const fileName = `${video.id}_${video.author.replace('@', '')}.mp4`;
      addLog('info', 'Iniciando upload para Gofile', `Arquivo: ${fileName} - URL fonte: ${downloadResponse.data}`, videoId);
      
      const uploadResponse = await gofileService.uploadFile(
        downloadResponse.data!,
        fileName
      );

      if (!uploadResponse.success) {
        const errorDetail = uploadResponse.error || 'Falha no upload';
        addLog('error', 'Falha no upload para Gofile', `Erro: ${errorDetail} - Arquivo: ${fileName}`, videoId);
        throw new Error(errorDetail);
      }

      const totalTime = new Date().getTime() - startTime.getTime();
      addLog('success', 'Upload concluído com sucesso', `Tempo total: ${(totalTime/1000).toFixed(1)}s - Link: ${uploadResponse.data?.downloadPage}`, videoId);

      updateVideoState(videoId, {
        status: 'completed',
        progress: 100,
        gofileUrl: uploadResponse.data?.downloadPage
      });

      setCurrentStep({
        id: `complete_${videoId}`,
        name: `Vídeo ${videoIndex + 1}/${totalVideos} processado`,
        status: 'completed',
        progress: 100,
        timestamp: new Date()
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      const currentRetries = retryCount.get(videoId) || 0;
      
      if (currentRetries < maxRetries) {
        setRetryCount(prev => new Map(prev).set(videoId, currentRetries + 1));
        
        addLog('warning', `Tentativa de retry ${currentRetries + 1}/${maxRetries}`, `Aguardando ${(currentRetries + 1) * 2}s - Erro: ${errorMessage} - URL: ${video.url}`, videoId);
        
        toast({
          title: "Tentativa de Retry",
          description: `Tentando novamente (${currentRetries + 1}/${maxRetries})`,
          variant: "default"
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (currentRetries + 1)));
        return await processVideo(video, videoIndex, totalVideos, maxRetries);
      }

      // Max retries reached - mark as error and continue to next video
      addLog('error', `Falha após ${maxRetries} tentativas - Pulando para próximo`, `Erro final: ${errorMessage} - URL: ${video.url}`, videoId);

      updateVideoState(videoId, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      setCurrentStep({
        id: `error_${videoId}`,
        name: `Erro no vídeo ${videoIndex + 1}/${totalVideos} - Continuando...`,
        status: 'error',
        error: errorMessage,
        timestamp: new Date()
      });

      return false;
    }
  }, [updateVideoState, retryCount, toast, addLog]);

  const startDelayCountdown = useCallback((seconds: number, videoId: string) => {
    setDelayCountdown(seconds);
    addLog('info', `Iniciando delay de ${seconds}s antes do próximo download`, `Rate limiting obrigatório`, videoId);
    
    return new Promise<void>((resolve) => {
      let remaining = seconds;
      const interval = setInterval(() => {
        remaining--;
        setDelayCountdown(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          addLog('info', 'Delay concluído, iniciando download', undefined, videoId);
          setDelayCountdown(0);
          resolve();
        }
      }, 1000);
    });
  }, [addLog]);

  const processVideos = useCallback(async (videos: TikTokVideo[], onComplete: (processedVideos: TikTokVideo[]) => void) => {
    if (videos.length === 0) {
      toast({
        title: "Nenhum Vídeo",
        description: "Colete vídeos antes de processar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    initializeVideos(videos);
    
    addLog('info', `Iniciando processamento em lote`, `${videos.length} vídeos na fila`);

    try {
      const processedVideos: TikTokVideo[] = [];
      const failedVideos: string[] = [];
      
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setCurrentVideoIndex(i);
        
        addLog('info', `Processando vídeo ${i + 1}/${videos.length}`, `@${video.author} - ${video.url}`, video.id);
        
        try {
          // Add delay countdown before each download (except the first one)
          if (i > 0) {
            updateVideoState(video.id, { status: 'waiting', progress: 0 });
            addLog('info', `Aguardando delay obrigatório antes do vídeo ${i + 1}`, 'Rate limiting para evitar bloqueios', video.id);
            
            await startDelayCountdown(60, video.id);
          }
          
          const success = await processVideo(video, i, videos.length);
          
          if (success) {
            const state = processingState.get(video.id);
            processedVideos.push({
              ...video,
              downloadUrl: state?.gofileUrl
            });
            addLog('success', `Vídeo ${i + 1}/${videos.length} processado com sucesso`, `Total processados: ${processedVideos.length}`, video.id);
          } else {
            failedVideos.push(video.id);
            addLog('error', `Vídeo ${i + 1}/${videos.length} falhou - Continuando`, `URL: ${video.url} - Total falhas: ${failedVideos.length}`, video.id);
          }
          
        } catch (error) {
          // Catch any unexpected errors and continue processing
          const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
          failedVideos.push(video.id);
          addLog('error', `Erro inesperado no vídeo ${i + 1}/${videos.length} - Continuando`, `${errorMessage} - URL: ${video.url}`, video.id);
          
          updateVideoState(video.id, {
            status: 'error',
            progress: 0,
            error: errorMessage
          });
        }
        
        // Show progress update
        const totalProgress = Math.round(((i + 1) / videos.length) * 100);
        addLog('info', `Progresso geral: ${totalProgress}%`, `${i + 1}/${videos.length} vídeos processados`);
      }

      onComplete(processedVideos);
      
      const successCount = processedVideos.length;
      const errorCount = failedVideos.length;

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
      setIsProcessing(false);
      setCurrentStep(null);
      setDelayCountdown(0);
      setCurrentVideoIndex(0);
      addLog('info', 'Sessão de processamento finalizada', 'Sistema pronto para nova sessão');
    }
  }, [initializeVideos, processVideo, startDelayCountdown, updateVideoState, processingState, toast, addLog]);

  const getOverallProgress = useCallback((videos: TikTokVideo[]) => {
    if (videos.length === 0) return 0;
    
    const totalProgress = Array.from(processingState.values())
      .reduce((sum, state) => sum + state.progress, 0);
    
    return Math.round(totalProgress / videos.length);
  }, [processingState]);

  const getStatusCounts = useCallback(() => {
    const counts = { pending: 0, processing: 0, completed: 0, error: 0, waiting: 0 };
    
    processingState.forEach(state => {
      if (state.status === 'downloading' || state.status === 'uploading') {
        counts.processing++;
      } else {
        counts[state.status]++;
      }
    });

    return counts;
  }, [processingState]);

  return {
    processingState,
    currentStep,
    delayCountdown,
    currentVideoIndex,
    isProcessing,
    processVideos,
    getOverallProgress,
    getStatusCounts
  };
}