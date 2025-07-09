// Environment Configuration
// IMPORTANT: Never expose sensitive keys in frontend code
// This file demonstrates the proper structure for environment variables

export const ENV_CONFIG = {
  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // API Configuration (these would be backend-only in production)
  gofile: {
    // These should NEVER be exposed in frontend
    // They should be handled in a secure backend service
    accountId: process.env.GOFILE_ACCOUNT_ID || '', // Backend only
    accountToken: process.env.GOFILE_ACCOUNT_TOKEN || '', // Backend only
    apiUrl: 'https://api.gofile.io',
  },

  youtube: {
    // OAuth2 configuration (client ID can be public, others are backend-only)
    clientId: process.env.YOUTUBE_CLIENT_ID || '', // Can be public
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '', // Backend only
    projectId: process.env.YOUTUBE_PROJECT_ID || '', // Backend only
    authUri: process.env.YOUTUBE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: process.env.YOUTUBE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    redirectUris: process.env.YOUTUBE_REDIRECT_URIS || 'http://localhost:8080/auth/callback',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtubepartner'
    ]
  },

  // TikTok configuration
  tiktok: {
    // In production, use official TikTok API with proper authentication
    apiUrl: 'https://open-api.tiktok.com',
    // These would be backend-only
    clientKey: process.env.TIKTOK_CLIENT_KEY || '', // Backend only
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '', // Backend only
  },

  // Rate limiting configuration
  rateLimits: {
    tiktok: {
      requestsPerMinute: 60,
      burstLimit: 10
    },
    gofile: {
      requestsPerMinute: 30,
      burstLimit: 5
    },
    youtube: {
      requestsPerMinute: 100,
      uploadsPerDay: 50
    }
  }
};

// Security warning function
export const checkSecurityConfiguration = () => {
  const warnings: string[] = [];

  // Check if we're accidentally exposing secrets in frontend
  if (typeof window !== 'undefined') {
    if (ENV_CONFIG.gofile.accountToken) {
      warnings.push('SECURITY WARNING: Gofile token exposed in frontend!');
    }
    if (ENV_CONFIG.youtube.clientSecret) {
      warnings.push('SECURITY WARNING: YouTube client secret exposed in frontend!');
    }
    if (ENV_CONFIG.tiktok.clientSecret) {
      warnings.push('SECURITY WARNING: TikTok client secret exposed in frontend!');
    }
  }

  if (warnings.length > 0) {
    console.error('[AutomationSystem] SECURITY WARNINGS:', warnings);
    if (ENV_CONFIG.isProduction) {
      throw new Error('Security violation: Secrets exposed in production frontend');
    }
  }

  return warnings;
};

// Mock configuration for development/demo purposes
export const getMockConfig = () => ({
  ...ENV_CONFIG,
  // Override with safe mock values for development
  gofile: {
    ...ENV_CONFIG.gofile,
    accountId: 'demo_account_id',
    accountToken: 'demo_token' // This is safe for frontend demo
  },
  youtube: {
    ...ENV_CONFIG.youtube,
    clientSecret: 'demo_secret' // This is safe for frontend demo
  }
});

// Initialize security check
if (typeof window !== 'undefined') {
  checkSecurityConfiguration();
}