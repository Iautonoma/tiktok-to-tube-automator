import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
  videoId?: string;
}

interface LogsContextType {
  logs: LogEntry[];
  addLog: (level: LogEntry['level'], message: string, details?: string, videoId?: string) => void;
  clearLogs: () => void;
  getLogsByVideo: (videoId: string) => LogEntry[];
  getLogsByLevel: (level: LogEntry['level']) => LogEntry[];
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function useGlobalLogs() {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error('useGlobalLogs must be used within a LogsProvider');
  }
  return context;
}

const LOGS_STORAGE_KEY = 'automation_logs';
const MAX_LOGS = 1000; // Limit to prevent localStorage overflow

export function LogsProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Load logs from localStorage on mount
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setLogs(parsedLogs);
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }, []);

  // Save logs to localStorage whenever logs change
  useEffect(() => {
    try {
      // Keep only the most recent logs to prevent storage overflow
      const logsToSave = logs.slice(-MAX_LOGS);
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logsToSave));
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
      // If storage is full, clear old logs and try again
      try {
        const recentLogs = logs.slice(-100); // Keep only 100 most recent
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(recentLogs));
        setLogs(recentLogs);
      } catch (retryError) {
        console.error('Failed to save logs even after cleanup:', retryError);
      }
    }
  }, [logs]);

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
    
    // Also log to console for debugging
    const logLevel = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[logLevel](`[${level.toUpperCase()}] ${message}${details ? ` - ${details}` : ''}`);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    try {
      localStorage.removeItem(LOGS_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear logs from localStorage:', error);
    }
  }, []);

  const getLogsByVideo = useCallback((videoId: string) => {
    return logs.filter(log => log.videoId === videoId);
  }, [logs]);

  const getLogsByLevel = useCallback((level: LogEntry['level']) => {
    return logs.filter(log => log.level === level);
  }, [logs]);

  const value: LogsContextType = {
    logs,
    addLog,
    clearLogs,
    getLogsByVideo,
    getLogsByLevel
  };

  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  );
}
