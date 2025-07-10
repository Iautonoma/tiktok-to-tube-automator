// Security Audit and Logging System
// Monitoring and logging for security events

import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id?: string;
  event_type: 'auth_attempt' | 'auth_success' | 'auth_failure' | 'admin_action' | 'suspicious_activity' | 'rate_limit' | 'validation_error';
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved?: boolean;
}

class SecurityAuditLogger {
  private eventQueue: SecurityEvent[] = [];
  private isProcessing = false;
  private maxQueueSize = 100;

  constructor() {
    // Process events every 30 seconds
    setInterval(() => this.processQueue(), 30000);
    
    // Process queue on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.processQueue());
    }
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    };

    // Add to queue
    this.eventQueue.push(securityEvent);

    // Log locally for immediate debugging
    const logLevel = this.getLogLevel(event.severity);
    console[logLevel](`[SecurityAudit] ${event.event_type}:`, securityEvent);

    // Process immediately for critical events
    if (event.severity === 'critical') {
      await this.processQueue();
    }

    // Prevent queue overflow
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In a real implementation, this would send to a security logging service
      // For now, we'll store in browser storage and optionally send to Supabase
      await this.persistEvents(eventsToProcess);
    } catch (error) {
      console.error('[SecurityAudit] Failed to process security events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  private async persistEvents(events: SecurityEvent[]): Promise<void> {
    // Store in local storage for immediate access
    this.storeLocally(events);

    // Send critical events to server (if authenticated)
    const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'high');
    if (criticalEvents.length > 0) {
      await this.sendToServer(criticalEvents);
    }
  }

  private storeLocally(events: SecurityEvent[]): void {
    try {
      const existing = JSON.parse(localStorage.getItem('security_audit_log') || '[]');
      const combined = [...existing, ...events];
      
      // Keep only last 500 events
      const truncated = combined.slice(-500);
      localStorage.setItem('security_audit_log', JSON.stringify(truncated));
    } catch (error) {
      console.warn('[SecurityAudit] Failed to store events locally:', error);
    }
  }

  private async sendToServer(events: SecurityEvent[]): Promise<void> {
    try {
      // In production, send to dedicated security logging endpoint
      // For now, we'll use console logging with structured format
      events.forEach(event => {
        console.log('[SecurityAudit] Server Log:', JSON.stringify(event));
      });
    } catch (error) {
      console.error('[SecurityAudit] Failed to send events to server:', error);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // In production, this would be handled server-side
      return 'client_ip_not_available';
    } catch {
      return 'unknown';
    }
  }

  private getLogLevel(severity: SecurityEvent['severity']): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'log';
    }
  }

  // Get recent security events for admin dashboard
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    try {
      const events = JSON.parse(localStorage.getItem('security_audit_log') || '[]');
      return events.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  // Get security statistics
  getSecurityStats(): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
    const events = this.getRecentEvents(1000);
    
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    events.forEach(event => {
      byType[event.event_type] = (byType[event.event_type] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    });

    return {
      total: events.length,
      byType,
      bySeverity
    };
  }

  // Clear old events (for maintenance)
  clearOldEvents(daysBefore: number = 30): void {
    try {
      const events = this.getRecentEvents(10000);
      const cutoffDate = new Date(Date.now() - (daysBefore * 24 * 60 * 60 * 1000));
      
      const recentEvents = events.filter(event => 
        new Date(event.timestamp) > cutoffDate
      );
      
      localStorage.setItem('security_audit_log', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('[SecurityAudit] Failed to clear old events:', error);
    }
  }
}

// Export singleton instance
export const securityAudit = new SecurityAuditLogger();

// Convenience functions for common security events
export const logAuthAttempt = (userId?: string, success: boolean = false, details: any = {}) => {
  securityAudit.logSecurityEvent({
    event_type: success ? 'auth_success' : 'auth_failure',
    user_id: userId,
    details,
    severity: success ? 'low' : 'medium'
  });
};

export const logAdminAction = (userId: string, action: string, target?: string, details: any = {}) => {
  securityAudit.logSecurityEvent({
    event_type: 'admin_action',
    user_id: userId,
    details: {
      action,
      target,
      ...details
    },
    severity: 'medium'
  });
};

export const logSuspiciousActivity = (details: any, severity: SecurityEvent['severity'] = 'high') => {
  securityAudit.logSecurityEvent({
    event_type: 'suspicious_activity',
    details,
    severity
  });
};

export const logRateLimit = (identifier: string, details: any = {}) => {
  securityAudit.logSecurityEvent({
    event_type: 'rate_limit',
    details: {
      identifier,
      ...details
    },
    severity: 'medium'
  });
};

export const logValidationError = (field: string, value: any, errors: string[]) => {
  securityAudit.logSecurityEvent({
    event_type: 'validation_error',
    details: {
      field,
      value: typeof value === 'string' ? value.substring(0, 100) : 'non_string_value',
      errors
    },
    severity: 'low'
  });
};
