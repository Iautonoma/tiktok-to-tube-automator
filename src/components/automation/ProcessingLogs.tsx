import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Info, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  videoId?: string;
}

interface ProcessingLogsProps {
  logs: LogEntry[];
  className?: string;
}

export function ProcessingLogs({ logs, className }: ProcessingLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      const scrollElement = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="h-3 w-3 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    }
  };

  const getLogVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'secondary';
      case 'warning':
        return 'outline';
      case 'error':
        return 'destructive';
      case 'success':
        return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Logs do Sistema ({logs.length})
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea 
          className="h-48 px-4 pb-4"
          onScrollCapture={(e) => {
            const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
            if (target) {
              const isAtBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 10;
              setAutoScroll(isAtBottom);
            }
          }}
        >
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Aguardando logs do sistema...
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-xs p-2 rounded border border-border/50 bg-background/30"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString('pt-BR')}
                      </span>
                      <Badge variant={getLogVariant(log.level)} className="text-xs h-4">
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.videoId && (
                        <Badge variant="outline" className="text-xs h-4">
                          {log.videoId.substring(0, 8)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-foreground">
                      {log.message}
                    </div>
                    {log.details && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
      <Timer className="h-4 w-4 text-orange-500 animate-pulse" />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            Aguardando próximo download
          </span>
          <span className="text-sm text-orange-600 dark:text-orange-400">
            {remainingSeconds}s restantes
          </span>
        </div>
        <div className="w-full bg-orange-200 dark:bg-orange-900/30 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-1000" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}