// Input Validation Security Layer
// Comprehensive validation utilities for enhanced security

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

export class SecurityValidator {
  // Input length limits
  private static readonly LIMITS = {
    email: 254,
    name: 100,
    password: 128,
    text: 1000,
    description: 5000,
    url: 2048,
    fileName: 255
  };

  // Common regex patterns
  private static readonly PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    alphanumeric: /^[a-zA-Z0-9_-]+$/,
    safeText: /^[a-zA-Z0-9\s.,!?()-_'"\u00C0-\u017F]+$/,
    url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
    fileName: /^[a-zA-Z0-9._-]+$/
  };

  // Dangerous patterns to block
  private static readonly BLOCKED_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i,
    /expression\s*\(/i,
    /alert\s*\(/i,
    /document\./i,
    /window\./i,
    /eval\s*\(/i,
    /function\s*\(/i
  ];

  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email é obrigatório');
    } else {
      if (email.length > this.LIMITS.email) {
        errors.push(`Email muito longo (máximo ${this.LIMITS.email} caracteres)`);
      }
      
      if (!this.PATTERNS.email.test(email)) {
        errors.push('Formato de email inválido');
      }
      
      // Check for dangerous patterns
      if (this.hasDangerousContent(email)) {
        errors.push('Email contém caracteres não permitidos');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: email?.toLowerCase().trim()
    };
  }

  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Senha é obrigatória');
    } else {
      if (password.length < 8) {
        errors.push('Senha deve ter pelo menos 8 caracteres');
      }
      
      if (password.length > this.LIMITS.password) {
        errors.push(`Senha muito longa (máximo ${this.LIMITS.password} caracteres)`);
      }
      
      // Password strength requirements
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra minúscula');
      }
      
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra maiúscula');
      }
      
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Senha deve conter pelo menos um número');
      }
      
      if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?])/.test(password)) {
        errors.push('Senha deve conter pelo menos um caractere especial');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: password // Don't sanitize passwords
    };
  }

  static validateName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name) {
      errors.push('Nome é obrigatório');
    } else {
      const trimmedName = name.trim();
      
      if (trimmedName.length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
      }
      
      if (trimmedName.length > this.LIMITS.name) {
        errors.push(`Nome muito longo (máximo ${this.LIMITS.name} caracteres)`);
      }
      
      if (!this.PATTERNS.safeText.test(trimmedName)) {
        errors.push('Nome contém caracteres não permitidos');
      }
      
      if (this.hasDangerousContent(trimmedName)) {
        errors.push('Nome contém conteúdo não permitido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: this.sanitizeText(name)
    };
  }

  static validateText(text: string, maxLength: number = this.LIMITS.text): ValidationResult {
    const errors: string[] = [];
    
    if (text && text.length > maxLength) {
      errors.push(`Texto muito longo (máximo ${maxLength} caracteres)`);
    }
    
    if (this.hasDangerousContent(text)) {
      errors.push('Texto contém conteúdo não permitido');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: this.sanitizeText(text)
    };
  }

  static validateUrl(url: string): ValidationResult {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('URL é obrigatória');
    } else {
      if (url.length > this.LIMITS.url) {
        errors.push(`URL muito longa (máximo ${this.LIMITS.url} caracteres)`);
      }
      
      if (!this.PATTERNS.url.test(url)) {
        errors.push('Formato de URL inválido');
      }
      
      if (this.hasDangerousContent(url)) {
        errors.push('URL contém conteúdo não permitido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: url?.trim()
    };
  }

  static validateFileName(fileName: string): ValidationResult {
    const errors: string[] = [];
    
    if (!fileName) {
      errors.push('Nome do arquivo é obrigatório');
    } else {
      if (fileName.length > this.LIMITS.fileName) {
        errors.push(`Nome do arquivo muito longo (máximo ${this.LIMITS.fileName} caracteres)`);
      }
      
      if (!this.PATTERNS.fileName.test(fileName)) {
        errors.push('Nome do arquivo contém caracteres não permitidos');
      }
      
      // Check for dangerous file extensions
      const extension = fileName.split('.').pop()?.toLowerCase();
      const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'php', 'asp'];
      if (extension && dangerousExtensions.includes(extension)) {
        errors.push('Tipo de arquivo não permitido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: fileName?.trim()
    };
  }

  private static hasDangerousContent(input: string): boolean {
    if (!input) return false;
    
    return this.BLOCKED_PATTERNS.some(pattern => pattern.test(input));
  }

  private static sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, this.LIMITS.text); // Enforce length limit
  }

  // Validate multiple fields at once
  static validateForm(fields: Record<string, any>): { isValid: boolean; errors: Record<string, string[]> } {
    const errors: Record<string, string[]> = {};
    let isValid = true;

    Object.entries(fields).forEach(([fieldName, value]) => {
      let result: ValidationResult;
      
      switch (fieldName) {
        case 'email':
          result = this.validateEmail(value);
          break;
        case 'password':
          result = this.validatePassword(value);
          break;
        case 'name':
        case 'fullName':
        case 'displayName':
          result = this.validateName(value);
          break;
        case 'url':
          result = this.validateUrl(value);
          break;
        case 'fileName':
          result = this.validateFileName(value);
          break;
        default:
          result = this.validateText(value);
      }
      
      if (!result.isValid) {
        errors[fieldName] = result.errors;
        isValid = false;
      }
    });

    return { isValid, errors };
  }
}