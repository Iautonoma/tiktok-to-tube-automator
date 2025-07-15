import { useState, useCallback, useRef } from 'react';
import { SecurityValidator } from '@/lib/security/validation';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
  requestLog: number[];
  violationCount: number;
}

interface RateLimitConfig {
  maxAttempts?: number;
  blockDuration?: number;
  windowMs?: number;
  maxRequestsPerWindow?: number;
}

interface SecurityOptions {
  validateInput?: boolean;
  logSuspiciousActivity?: boolean;
  escalateOnRepeatedViolations?: boolean;
}

export function useRateLimit(
  config: RateLimitConfig = {}, 
  securityOptions: SecurityOptions = {}
) {
  const {
    maxAttempts = 5,
    blockDuration = 300000, // 5 minutes
    windowMs = 60000, // 1 minute
    maxRequestsPerWindow = 20
  } = config;

  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    isBlocked: false,
    requestLog: [],
    violationCount: 0
  });

  const lastViolationRef = useRef<number>(0);

  const logSecurityEvent = useCallback((event: string, details: any) => {
    if (securityOptions.logSuspiciousActivity) {
      console.warn(`[SECURITY] Rate Limit Event: ${event}`, {
        timestamp: new Date().toISOString(),
        details,
        userAgent: navigator.userAgent
      });
    }
  }, [securityOptions.logSuspiciousActivity]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Check window-based rate limiting
    const windowStart = now - windowMs;
    const recentRequests = state.requestLog.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= maxRequestsPerWindow) {
      logSecurityEvent('WINDOW_RATE_LIMIT_EXCEEDED', {
        recentRequests: recentRequests.length,
        maxAllowed: maxRequestsPerWindow,
        windowMs
      });
      
      return { 
        allowed: false, 
        waitTime: Math.ceil(windowMs / 1000),
        reason: 'Too many requests in window'
      };
    }
    
    // Reset if block duration has passed
    if (state.isBlocked && now - state.lastAttempt > blockDuration) {
      setState(prev => ({
        ...prev,
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false,
        violationCount: 0
      }));
      return { allowed: true, waitTime: 0 };
    }
    
    // Check if currently blocked
    if (state.isBlocked) {
      const waitTime = Math.ceil((blockDuration - (now - state.lastAttempt)) / 1000);
      return { 
        allowed: false, 
        waitTime,
        reason: `Blocked due to ${state.attempts} failed attempts`
      };
    }
    
    return { allowed: true, waitTime: 0 };
  }, [state, blockDuration, windowMs, maxRequestsPerWindow, logSecurityEvent]);

  const recordAttempt = useCallback((success: boolean, requestInput?: any) => {
    const now = Date.now();
    
    // Validate input if enabled
    if (requestInput && securityOptions.validateInput) {
      const validation = SecurityValidator.validateText(JSON.stringify(requestInput), 1000);
      if (!validation.isValid) {
        logSecurityEvent('INVALID_INPUT_DETECTED', {
          errors: validation.errors,
          input: typeof requestInput === 'string' ? requestInput.substring(0, 100) : '[OBJECT]'
        });
      }
    }
    
    // Update request log (keep only recent requests)
    const windowStart = now - windowMs;
    const updatedRequestLog = [...state.requestLog.filter(t => t > windowStart), now];
    
    if (success) {
      // Reset on successful attempt
      setState(prev => ({
        ...prev,
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false,
        requestLog: updatedRequestLog
      }));
    } else {
      const newAttempts = state.attempts + 1;
      const newViolationCount = state.violationCount + 1;
      const shouldBlock = newAttempts >= maxAttempts;
      
      if (shouldBlock) {
        lastViolationRef.current = now;
        
        // Escalate block duration for repeated violations
        let actualBlockDuration = blockDuration;
        if (securityOptions.escalateOnRepeatedViolations && newViolationCount > 1) {
          actualBlockDuration = blockDuration * Math.min(newViolationCount, 5);
        }
        
        logSecurityEvent('USER_BLOCKED', {
          attempts: newAttempts,
          violationCount: newViolationCount,
          blockDuration: actualBlockDuration,
          escalated: actualBlockDuration > blockDuration
        });
      }
      
      setState(prev => ({
        ...prev,
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: shouldBlock,
        requestLog: updatedRequestLog,
        violationCount: newViolationCount
      }));
    }
  }, [state, maxAttempts, windowMs, blockDuration, logSecurityEvent, securityOptions]);

  const getDelay = useCallback(() => {
    // Progressive delay based on attempts with security escalation
    const baseDelay = Math.min(1000 * Math.pow(2, state.attempts), 10000);
    const violationMultiplier = Math.min(1 + (state.violationCount * 0.5), 3);
    return Math.floor(baseDelay * violationMultiplier);
  }, [state.attempts, state.violationCount]);

  const executeWithRateLimit = useCallback(async <T>(
    fn: () => Promise<T>,
    requestInput?: any
  ): Promise<{ success: boolean; data?: T; error?: string; waitTime?: number }> => {
    const limitCheck = checkRateLimit();
    
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.reason || 'Rate limit exceeded',
        waitTime: limitCheck.waitTime
      };
    }

    try {
      const data = await fn();
      recordAttempt(true, requestInput);
      return { success: true, data };
    } catch (error) {
      recordAttempt(false, requestInput);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }, [checkRateLimit, recordAttempt]);

  const reset = useCallback(() => {
    setState({
      attempts: 0,
      lastAttempt: 0,
      isBlocked: false,
      requestLog: [],
      violationCount: 0
    });
  }, []);

  return {
    checkRateLimit,
    recordAttempt,
    executeWithRateLimit,
    getDelay,
    reset,
    isBlocked: state.isBlocked,
    attempts: state.attempts,
    violationCount: state.violationCount,
    lastViolation: lastViolationRef.current
  };
}