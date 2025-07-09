import { useState, useCallback } from 'react';
import { Youtube, Upload, Settings, ExternalLink, AlertCircle, CheckCircle2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { TikTokVideo, AutomationConfig } from '@/lib/types/automation';
import { youtubeService } from '@/lib/services/youtube-service';

interface YouTubeUploaderProps {
  videos: TikTokVideo[];
  config: AutomationConfig;
  onConfigUpdate: (config: Partial<AutomationConfig>) => void;
  isProcessing: boolean;
  onUploadComplete: (results: { successful: number; failed: number }) => void;
}

interface UploadState {
  videoId: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  youtubeId?: string;
  youtubeUrl?: string;
  error?: string;
}

export function YouTubeUploader({
  videos,
  config,
  onConfigUpdate,
  isProcessing,
  onUploadComplete
}: YouTubeUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadStates, setUploadStates] = useState<Map<string, UploadState>>(new Map());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    onConfigUpdate(updates);
  };

  const updateUploadState = useCallback((videoId: string, updates: Partial<UploadState>) => {
    setUploadStates(prev => {
      const newState = new Map(prev);
      const current = newState.get(videoId);
      if (current) {
        newState.set(videoId, { ...current, ...updates });
      }
      return newState;
    });
  }, []);

  const handleAuthentication = useCallback(async () => {
    try {
      console.log('[AutomationSystem] Starting YouTube authentication');
      
      const response = await youtubeService.authenticate();
      
      if (response.success) {
        setIsAuthenticated(true);
        toast({
          title: "Autenticação Concluída",
          description: "Conectado ao YouTube com sucesso",
        });
      } else {
        throw new Error(response.error || 'Falha na autenticação');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro de autenticação';
      console.error('[AutomationSystem] YouTube auth error:', errorMessage);
      
      toast({
        title: "Erro de Autenticação",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  const uploadVideo = useCallback(async (video: TikTokVideo): Promise<boolean> => {
    if (!video.downloadUrl) {
      console.error('[AutomationSystem] No download URL for video:', video.id);
      return false;
    }

    const videoId = video.id;
    console.log(`[AutomationSystem] Uploading video to YouTube: ${videoId}`);

    try {
      updateUploadState(videoId, { status: 'uploading', progress: 10 });

      const metadata = {
        title: `${config.youtubeChannel.title} - ${video.description.substring(0, 50)}`,
        description: `${config.youtubeChannel.description}\n\nOriginal: ${video.author}\n${video.description}`,
        tags: [...config.youtubeChannel.tags, ...video.tags],
        category: config.youtubeChannel.category,
        privacy: config.youtubeChannel.privacy
      };

      updateUploadState(videoId, { progress: 30 });

      const response = await youtubeService.uploadVideo(video.downloadUrl, metadata);

      if (!response.success) {
        throw new Error(response.error || 'Falha no upload');
      }

      updateUploadState(videoId, {
        status: 'completed',
        progress: 100,
        youtubeId: response.data?.videoId,
        youtubeUrl: response.data?.url
      });

      console.log(`[AutomationSystem] Video uploaded to YouTube: ${response.data?.videoId}`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
      console.error(`[AutomationSystem] YouTube upload error: ${videoId}`, errorMessage);

      updateUploadState(videoId, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });

      return false;
    }
  }, [config.youtubeChannel, updateUploadState]);

  const startUpload = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: "Autenticação Necessária",
        description: "Faça login no YouTube primeiro",
        variant: "destructive"
      });
      return;
    }

    if (videos.length === 0) {
      toast({
        title: "Nenhum Vídeo",
        description: "Processe vídeos antes de fazer upload",
        variant: "destructive"
      });
      return;
    }

    // Validate configuration
    if (!config.youtubeChannel.title.trim()) {
      toast({
        title: "Configuração Incompleta",
        description: "Configure o título do canal",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    console.log(`[AutomationSystem] Starting YouTube upload for ${videos.length} videos`);

    // Initialize upload states
    const newStates = new Map<string, UploadState>();
    videos.forEach(video => {
      newStates.set(video.id, {
        videoId: video.id,
        status: 'pending',
        progress: 0
      });
    });
    setUploadStates(newStates);

    try {
      let successful = 0;
      let failed = 0;

      // Upload videos sequentially to avoid rate limits
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const success = await uploadVideo(video);
        
        if (success) {
          successful++;
        } else {
          failed++;
        }

        // Add delay between uploads to respect YouTube rate limits
        if (i < videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      onUploadComplete({ successful, failed });

      toast({
        title: "Upload Concluído",
        description: `${successful} sucessos, ${failed} falhas`,
        variant: successful > 0 ? "default" : "destructive"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload em lote';
      console.error('[AutomationSystem] Batch upload error:', errorMessage);
      
      toast({
        title: "Erro no Upload",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [isAuthenticated, videos, config.youtubeChannel, uploadVideo, onUploadComplete, toast]);

  const getOverallProgress = () => {
    if (videos.length === 0) return 0;
    
    const totalProgress = Array.from(uploadStates.values())
      .reduce((sum, state) => sum + state.progress, 0);
    
    return Math.round(totalProgress / videos.length);
  };

  const getStatusCounts = () => {
    const counts = { pending: 0, uploading: 0, completed: 0, error: 0 };
    
    uploadStates.forEach(state => {
      counts[state.status]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const overallProgress = getOverallProgress();

  return (
    <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md shadow-glass animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
            <Youtube className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">YouTube Uploader</CardTitle>
            <CardDescription>Autenticação e upload para YouTube</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Authentication */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="text-sm font-medium">Autenticação YouTube</span>
            </div>
            <Badge variant={isAuthenticated ? "default" : "secondary"}>
              {isAuthenticated ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          
          {!isAuthenticated && (
            <Button
              onClick={handleAuthentication}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              <Youtube className="mr-2 h-4 w-4" />
              Conectar ao YouTube
            </Button>
          )}
        </div>

        {/* Channel Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Configuração do Canal</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="channel-title" className="text-sm">Título Padrão</Label>
              <Input
                id="channel-title"
                placeholder="Meu Canal Incrível"
                value={config.youtubeChannel.title}
                onChange={(e) => updateConfig({
                  youtubeChannel: {
                    ...config.youtubeChannel,
                    title: e.target.value
                  }
                })}
                disabled={isProcessing}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-description" className="text-sm">Descrição Padrão</Label>
              <Textarea
                id="channel-description"
                placeholder="Conteúdo incrível do TikTok..."
                value={config.youtubeChannel.description}
                onChange={(e) => updateConfig({
                  youtubeChannel: {
                    ...config.youtubeChannel,
                    description: e.target.value
                  }
                })}
                disabled={isProcessing}
                className="bg-background/50 resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-tags" className="text-sm">Tags (separadas por vírgula)</Label>
              <Input
                id="channel-tags"
                placeholder="viral, trending, tiktok"
                value={config.youtubeChannel.tags.join(', ')}
                onChange={(e) => updateConfig({
                  youtubeChannel: {
                    ...config.youtubeChannel,
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                  }
                })}
                disabled={isProcessing}
                className="bg-background/50"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-3 p-4 rounded-lg bg-background/30 border border-border/30">
              <h5 className="font-medium text-sm">Configurações Avançadas</h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={config.youtubeChannel.category}
                    onValueChange={(value) => updateConfig({
                      youtubeChannel: {
                        ...config.youtubeChannel,
                        category: value
                      }
                    })}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entertainment">Entretenimento</SelectItem>
                      <SelectItem value="Music">Música</SelectItem>
                      <SelectItem value="Comedy">Comédia</SelectItem>
                      <SelectItem value="Education">Educação</SelectItem>
                      <SelectItem value="Gaming">Games</SelectItem>
                      <SelectItem value="Sports">Esportes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Privacidade</Label>
                  <Select
                    value={config.youtubeChannel.privacy}
                    onValueChange={(value: 'private' | 'public' | 'unlisted') => updateConfig({
                      youtubeChannel: {
                        ...config.youtubeChannel,
                        privacy: value
                      }
                    })}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Privado</SelectItem>
                      <SelectItem value="unlisted">Não listado</SelectItem>
                      <SelectItem value="public">Público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progresso do Upload</span>
              <span className="text-sm text-muted-foreground">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>Pendente: {statusCounts.pending}</div>
              <div>Enviando: {statusCounts.uploading}</div>
              <div>Concluído: {statusCounts.completed}</div>
              <div>Erro: {statusCounts.error}</div>
            </div>
          </div>
        )}

        {/* Upload Results */}
        {uploadStates.size > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            <h4 className="text-sm font-medium">Resultados do Upload</h4>
            {Array.from(uploadStates.entries()).map(([videoId, state]) => {
              const video = videos.find(v => v.id === videoId);
              return (
                <div
                  key={videoId}
                  className="flex items-center justify-between p-2 rounded bg-background/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{video?.author}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {state.error || 'Upload em andamento...'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        state.status === 'completed' ? 'default' :
                        state.status === 'error' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {state.status === 'uploading' ? 'Upload' :
                       state.status === 'completed' ? 'OK' :
                       state.status === 'error' ? 'Erro' : 'Pendente'}
                    </Badge>
                    {state.youtubeUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(state.youtubeUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={startUpload}
          disabled={!isAuthenticated || isUploading || videos.length === 0 || !config.youtubeChannel.title.trim()}
          className="w-full bg-gradient-to-r from-destructive to-red-600 hover:shadow-glow transition-all duration-300"
        >
          {isUploading ? (
            <>
              <div className="animate-processing mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Enviando para YouTube...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Enviar {videos.length} Vídeos
            </>
          )}
        </Button>

        {/* Service Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>OAuth2 necessário para autenticação</span>
          </div>
          <div className="flex items-center gap-1">
            <span>• Rate limit: 100 uploads/min respeitado</span>
          </div>
          <div className="flex items-center gap-1">
            <span>• Metadados aplicados automaticamente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}