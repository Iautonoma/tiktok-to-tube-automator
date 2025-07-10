import { useState, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  isBlocked: boolean;
}

export function useRateLimit(maxAttempts: number = 5, blockDuration: number = 300000) { // 5 minutes block
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    isBlocked: false
  });

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Reset if block duration has passed
    if (state.isBlocked && now - state.lastAttempt > blockDuration) {
      setState({
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false
      });
      return { allowed: true, waitTime: 0 };
    }
    
    // Check if currently blocked
    if (state.isBlocked) {
      const waitTime = Math.ceil((blockDuration - (now - state.lastAttempt)) / 1000);
      return { allowed: false, waitTime };
    }
    
    return { allowed: true, waitTime: 0 };
  }, [state, blockDuration]);

  const recordAttempt = useCallback((success: boolean) => {
    const now = Date.now();
    
    if (success) {
      // Reset on successful attempt
      setState({
        attempts: 0,
        lastAttempt: 0,
        isBlocked: false
      });
    } else {
      const newAttempts = state.attempts + 1;
      const shouldBlock = newAttempts >= maxAttempts;
      
      setState({
        attempts: newAttempts,
        lastAttempt: now,
        isBlocked: shouldBlock
      });
    }
  }, [state, maxAttempts]);

  const getDelay = useCallback(() => {
    // Progressive delay based on attempts
    return Math.min(1000 * Math.pow(2, state.attempts), 10000);
  }, [state.attempts]);

  return {
    checkRateLimit,
    recordAttempt,
    getDelay,
    isBlocked: state.isBlocked,
    attempts: state.attempts
  };
}