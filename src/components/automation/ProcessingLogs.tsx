import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useGlobalLogs, LogEntry } from '@/contexts/LogsContext';

interface ProcessingLogsProps {
  className?: string;
}

function LogMessage({ message }: { message: string }) {
  // Enhanced URL detection to make links clickable
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const parts = message.split(linkRegex);
  
  return (
    <span>
      {parts.map((part, index) => {
        if (linkRegex.test(part)) {
          const isTikTokLink = part.includes('tiktok.com');
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-glow underline inline-flex items-center gap-1"
            >
              {isTikTokLink ? '🎵' : '🔗'} {part}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

export function ProcessingLogs({ className }: ProcessingLogsProps) {
  const { logs } = useGlobalLogs();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs.length]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  const getLogVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'outline' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Card className={`bg-background/30 border-border/30 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Logs de Processamento</CardTitle>
          <Badge variant="outline" className="text-xs">
            {logs.length} entradas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea ref={scrollAreaRef} className="h-48 w-full">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aguardando logs...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 p-2 rounded-lg bg-background/20 border border-border/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {getLogIcon(log.level)}
                    <Badge variant={getLogVariant(log.level)} className="text-xs h-5">
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="text-muted-foreground">
                      {log.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                    {log.videoId && (
                      <Badge variant="outline" className="text-xs h-5">
                        {log.videoId.slice(-8)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    <LogMessage message={log.message} />
                  </div>
                  {log.details && (
                    <div className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-border/30">
                      <LogMessage message={log.details} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function DelayCountdown({ 
  remainingSeconds, 
  totalSeconds = 60 
}: { 
  remainingSeconds: number; 
  totalSeconds?: number;
}) {
  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  
  return (
    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            Rate Limit Delay
          </span>
        </div>
        <span className="text-sm font-mono text-orange-700 dark:text-orange-300">
          {remainingSeconds}s
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-2" 
      />
      <p className="text-xs text-muted-foreground mt-1">
        Aguardando para evitar bloqueios...
      </p>
    </div>
  );
}

export type { LogEntry };