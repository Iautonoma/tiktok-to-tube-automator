// Enhanced Environment Security Configuration
// Runtime validation and security checks for environment variables

export interface EnvironmentSecurityCheck {
  check: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class EnvironmentSecurity {
  private checks: EnvironmentSecurityCheck[] = [];
  private isInitialized = false;

  constructor() {
    this.runSecurityChecks();
  }

  private runSecurityChecks(): void {
    this.checks = [];

    // Check 1: Environment detection
    this.checkEnvironment();
    
    // Check 2: Secret exposure validation
    this.checkSecretExposure();
    
    // Check 3: Development tools detection
    this.checkDevelopmentTools();
    
    // Check 4: Browser security features
    this.checkBrowserSecurity();
    
    // Check 5: Network security
    this.checkNetworkSecurity();

    this.isInitialized = true;
    this.reportResults();
  }

  private checkEnvironment(): void {
    const nodeEnv = process.env.NODE_ENV;
    const isDev = nodeEnv === 'development';
    const isProd = nodeEnv === 'production';

    if (!nodeEnv) {
      this.addCheck('environment_detection', 'fail', 
        'NODE_ENV não está definido', 'high');
    } else if (isProd) {
      this.addCheck('environment_detection', 'pass', 
        'Ambiente de produção detectado', 'low');
    } else if (isDev) {
      this.addCheck('environment_detection', 'warn', 
        'Ambiente de desenvolvimento detectado', 'low');
    } else {
      this.addCheck('environment_detection', 'warn', 
        `Ambiente desconhecido: ${nodeEnv}`, 'medium');
    }
  }

  private checkSecretExposure(): void {
    if (typeof window === 'undefined') return;

    const secrets = [
      'GOFILE_ACCOUNT_TOKEN',
      'YOUTUBE_CLIENT_SECRET',
      'TIKTOK_CLIENT_SECRET',
      'SUPABASE_ANON_KEY' // This one is actually safe to expose
    ];

    let exposedSecrets = 0;
    secrets.forEach(secret => {
      // Check if secret is accessible in browser
      if (window && (window as any)[secret]) {
        exposedSecrets++;
      }
    });

    // Check process.env exposure
    const processEnvKeys = Object.keys(process.env || {});
    const sensitiveKeys = processEnvKeys.filter(key => 
      key.includes('SECRET') || 
      key.includes('KEY') || 
      key.includes('TOKEN') ||
      key.includes('PASSWORD')
    );

    if (exposedSecrets > 0) {
      this.addCheck('secret_exposure', 'fail', 
        `${exposedSecrets} secrets expostos no frontend`, 'critical');
    } else if (sensitiveKeys.length > 2) { // Allow SUPABASE_ANON_KEY and one other
      this.addCheck('secret_exposure', 'warn', 
        `${sensitiveKeys.length} chaves sensíveis no process.env`, 'medium');
    } else {
      this.addCheck('secret_exposure', 'pass', 
        'Nenhum secret crítico exposto', 'low');
    }
  }

  private checkDevelopmentTools(): void {
    if (typeof window === 'undefined') return;

    const devToolsIndicators = [
      () => window.console && window.console.clear && !window.console.clear.toString().includes('[native code]'),
      () => (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
      () => (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__,
      () => window.navigator.webdriver,
      () => (window as any).Cypress
    ];

    const detectedTools = devToolsIndicators.filter(check => {
      try {
        return check();
      } catch {
        return false;
      }
    }).length;

    if (process.env.NODE_ENV === 'production' && detectedTools > 0) {
      this.addCheck('development_tools', 'warn', 
        `${detectedTools} ferramentas de desenvolvimento detectadas em produção`, 'medium');
    } else if (process.env.NODE_ENV === 'development') {
      this.addCheck('development_tools', 'pass', 
        'Ferramentas de desenvolvimento permitidas em dev', 'low');
    } else {
      this.addCheck('development_tools', 'pass', 
        'Nenhuma ferramenta de desenvolvimento detectada', 'low');
    }
  }

  private checkBrowserSecurity(): void {
    if (typeof window === 'undefined') return;

    const securityFeatures = {
      https: window.location.protocol === 'https:',
      csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      xfo: document.querySelector('meta[http-equiv="X-Frame-Options"]'),
      hsts: window.location.protocol === 'https:' // Simplified check
    };

    const enabledFeatures = Object.values(securityFeatures).filter(Boolean).length;
    const totalFeatures = Object.keys(securityFeatures).length;

    if (enabledFeatures === totalFeatures) {
      this.addCheck('browser_security', 'pass', 
        'Todas as funcionalidades de segurança do browser estão ativas', 'low');
    } else if (enabledFeatures >= totalFeatures * 0.7) {
      this.addCheck('browser_security', 'warn', 
        `${enabledFeatures}/${totalFeatures} funcionalidades de segurança ativas`, 'medium');
    } else {
      this.addCheck('browser_security', 'fail', 
        `Apenas ${enabledFeatures}/${totalFeatures} funcionalidades de segurança ativas`, 'high');
    }
  }

  private checkNetworkSecurity(): void {
    if (typeof window === 'undefined') return;

    const isSecure = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

    if (isSecure || (isLocalhost && process.env.NODE_ENV === 'development')) {
      this.addCheck('network_security', 'pass', 
        'Conexão segura estabelecida', 'low');
    } else {
      this.addCheck('network_security', 'fail', 
        'Conexão insegura detectada', 'critical');
    }
  }

  private addCheck(check: string, status: EnvironmentSecurityCheck['status'], 
                  message: string, severity: EnvironmentSecurityCheck['severity']): void {
    this.checks.push({ check, status, message, severity });
  }

  private reportResults(): void {
    const failedChecks = this.checks.filter(c => c.status === 'fail');
    const warningChecks = this.checks.filter(c => c.status === 'warn');
    const criticalIssues = this.checks.filter(c => c.severity === 'critical');

    console.group('[EnvironmentSecurity] Security Check Results');
    
    if (criticalIssues.length > 0) {
      console.error('🚨 CRITICAL SECURITY ISSUES:');
      criticalIssues.forEach(check => {
        console.error(`  - ${check.message}`);
      });
    }

    if (failedChecks.length > 0) {
      console.warn('❌ Failed Security Checks:');
      failedChecks.forEach(check => {
        console.warn(`  - ${check.message}`);
      });
    }

    if (warningChecks.length > 0) {
      console.warn('⚠️ Security Warnings:');
      warningChecks.forEach(check => {
        console.warn(`  - ${check.message}`);
      });
    }

    const passedChecks = this.checks.filter(c => c.status === 'pass');
    console.log(`✅ ${passedChecks.length} security checks passed`);
    
    console.groupEnd();

    // Throw error for critical issues in production
    if (process.env.NODE_ENV === 'production' && criticalIssues.length > 0) {
      throw new Error(`Critical security issues detected: ${criticalIssues.map(i => i.message).join(', ')}`);
    }
  }

  getSecurityReport(): {
    summary: { total: number; passed: number; warnings: number; failed: number; critical: number };
    checks: EnvironmentSecurityCheck[];
    recommendations: string[];
  } {
    const summary = {
      total: this.checks.length,
      passed: this.checks.filter(c => c.status === 'pass').length,
      warnings: this.checks.filter(c => c.status === 'warn').length,
      failed: this.checks.filter(c => c.status === 'fail').length,
      critical: this.checks.filter(c => c.severity === 'critical').length
    };

    const recommendations = this.generateRecommendations();

    return { summary, checks: this.checks, recommendations };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    this.checks.forEach(check => {
      switch (check.check) {
        case 'secret_exposure':
          if (check.status !== 'pass') {
            recommendations.push('Mover secrets sensíveis para variáveis de ambiente do servidor');
            recommendations.push('Implementar gerenciamento seguro de secrets (ex: Supabase Secrets)');
          }
          break;
        case 'browser_security':
          if (check.status !== 'pass') {
            recommendations.push('Implementar Content Security Policy (CSP)');
            recommendations.push('Adicionar headers de segurança (X-Frame-Options, HSTS)');
          }
          break;
        case 'network_security':
          if (check.status !== 'pass') {
            recommendations.push('Implementar HTTPS em produção');
            recommendations.push('Configurar certificados SSL válidos');
          }
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Runtime validation
  validateRuntimeEnvironment(): boolean {
    if (!this.isInitialized) {
      this.runSecurityChecks();
    }

    const criticalIssues = this.checks.filter(c => c.severity === 'critical');
    return criticalIssues.length === 0;
  }
}

// Export singleton instance
export const environmentSecurity = new EnvironmentSecurity();

// Utility functions
export const getSecurityStatus = () => environmentSecurity.getSecurityReport();
export const isEnvironmentSecure = () => environmentSecurity.validateRuntimeEnvironment();