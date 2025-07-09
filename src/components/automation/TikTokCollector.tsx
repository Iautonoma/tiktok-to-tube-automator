import { useState, useCallback } from 'react';
import { Search, Video, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { TikTokVideo, AutomationConfig } from '@/lib/types/automation';
import { tiktokService } from '@/lib/services/tiktok-service';

interface TikTokCollectorProps {
  onVideosCollected: (videos: TikTokVideo[]) => void;
  config: AutomationConfig;
  onConfigUpdate: (config: Partial<AutomationConfig>) => void;
  isProcessing: boolean;
}

export function TikTokCollector({ 
  onVideosCollected, 
  config, 
  onConfigUpdate, 
  isProcessing 
}: TikTokCollectorProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [collectedVideos, setCollectedVideos] = useState<TikTokVideo[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!config.keyword.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, insira uma palavra-chave para buscar",
        variant: "destructive"
      });
      return;
    }

    if (config.videoCount < 1 || config.videoCount > 50) {
      toast({
        title: "Erro de Validação", 
        description: "Quantidade de vídeos deve estar entre 1 e 50",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    console.log('[AutomationSystem] Starting TikTok video collection');

    try {
      const response = await tiktokService.searchVideos(
        config.keyword,
        config.videoCount,
        config.filters
      );

      if (response.success && response.data) {
        setCollectedVideos(response.data);
        onVideosCollected(response.data);
        
        toast({
          title: "Coleta Concluída",
          description: `${response.data.length} vídeos coletados com sucesso`,
        });
      } else {
        throw new Error(response.error || 'Falha na busca');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[AutomationSystem] Collection error:', errorMessage);
      
      toast({
        title: "Erro na Coleta",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  }, [config, onVideosCollected, toast]);

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    onConfigUpdate(updates);
  };

  return (
    <Card className="bg-gradient-to-br from-glass-bg to-card/50 border-glass-border backdrop-blur-md shadow-glass animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Coletor TikTok</CardTitle>
            <CardDescription>Configure e colete vídeos do TikTok</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium">
              Palavra-chave de Busca
            </Label>
            <div className="flex gap-2">
              <Input
                id="keyword"
                placeholder="Ex: receitas, dança, comédia..."
                value={config.keyword}
                onChange={(e) => updateConfig({ keyword: e.target.value })}
                disabled={isProcessing}
                className="bg-background/50 border-border/50 focus:border-primary/50"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                disabled={isProcessing}
                className="border-border/50 hover:border-primary/50"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Quantidade de Vídeos: {config.videoCount}
            </Label>
            <Slider
              value={[config.videoCount]}
              onValueChange={([value]) => updateConfig({ videoCount: value })}
              min={1}
              max={50}
              step={1}
              disabled={isProcessing}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>50</span>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-4 p-4 rounded-lg bg-background/30 border border-border/30">
            <h4 className="font-medium text-sm">Filtros Avançados</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Duração Mínima (seg)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={config.filters?.minDuration || ''}
                  onChange={(e) => updateConfig({
                    filters: {
                      ...config.filters,
                      minDuration: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  })}
                  disabled={isProcessing}
                  className="bg-background/50 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Duração Máxima (seg)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={config.filters?.maxDuration || ''}
                  onChange={(e) => updateConfig({
                    filters: {
                      ...config.filters,
                      maxDuration: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  })}
                  disabled={isProcessing}
                  className="bg-background/50 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Palavras Excluídas (separadas por vírgula)</Label>
              <Textarea
                placeholder="spam, propaganda, nsfw"
                value={config.filters?.excludeKeywords?.join(', ') || ''}
                onChange={(e) => updateConfig({
                  filters: {
                    ...config.filters,
                    excludeKeywords: e.target.value ? e.target.value.split(',').map(k => k.trim()) : undefined
                  }
                })}
                disabled={isProcessing}
                className="bg-background/50 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleSearch}
          disabled={isSearching || isProcessing || !config.keyword.trim()}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300"
        >
          {isSearching ? (
            <>
              <div className="animate-processing mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Coletando Vídeos...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Coletar Vídeos
            </>
          )}
        </Button>

        {/* Results Summary */}
        {collectedVideos.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm text-success-foreground">
              {collectedVideos.length} vídeos coletados e prontos para download
            </span>
          </div>
        )}

        {/* Rate Limit Info */}
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Limite: 60 buscas por minuto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}