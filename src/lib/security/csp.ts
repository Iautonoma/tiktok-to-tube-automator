// Content Security Policy (CSP) Configuration
// Enhanced XSS protection through CSP headers

export const CSP_CONFIG = {
  // Production CSP - Strict security
  production: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Vite dev mode, remove in production
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS and Tailwind
      "https://fonts.googleapis.com"
    ],
    'font-src': [
      "'self'",
      "https://fonts.gstatic.com",
      "data:"
    ],
    'img-src': [
      "'self'",
      "https:",
      "data:",
      "blob:"
    ],
    'connect-src': [
      "'self'",
      "https://api.gofile.io",
      "https://open-api.tiktok.com",
      "https://oauth2.googleapis.com",
      "https://accounts.google.com",
      "https://www.googleapis.com",
      "https://*.supabase.co",
      "wss://*.supabase.co"
    ],
    'media-src': [
      "'self'",
      "https:",
      "blob:"
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // Development CSP - More permissive for dev tools
  development: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'", // Required for dev mode
      "https://cdn.jsdelivr.net",
      "https://unpkg.com"
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com"
    ],
    'font-src': [
      "'self'",
      "https://fonts.gstatic.com",
      "data:"
    ],
    'img-src': [
      "'self'",
      "https:",
      "http:",
      "data:",
      "blob:"
    ],
    'connect-src': [
      "'self'",
      "ws:",
      "wss:",
      "https:",
      "http:"
    ],
    'media-src': [
      "'self'",
      "https:",
      "http:",
      "blob:"
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  }
};

export function generateCSPHeader(environment: 'production' | 'development' = 'production'): string {
  const config = CSP_CONFIG[environment];
  
  const directives = Object.entries(config).map(([directive, sources]) => {
    if (sources.length === 0) {
      return directive.replace(/-/g, '-');
    }
    return `${directive} ${sources.join(' ')}`;
  });

  return directives.join('; ');
}

// Apply CSP to the current document (client-side)
export function applyCSP(): void {
  if (typeof document === 'undefined') return;
  
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const cspHeader = generateCSPHeader(environment);
  
  // Create or update CSP meta tag
  let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
  
  if (!cspMeta) {
    cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    document.head.appendChild(cspMeta);
  }
  
  cspMeta.content = cspHeader;
  
  console.log(`[SecuritySystem] CSP applied for ${environment}:`, cspHeader);
}

// Security headers configuration for server-side
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};