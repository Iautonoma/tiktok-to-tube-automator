import { ServiceResponse, GofileUploadResponse } from '@/lib/types/automation';

class GofileService {
  private accountId: string;
  private accountToken: string;
  private rateLimitCount = 0;
  private rateLimitReset = 0;
  private baseUrl = 'https://api.gofile.io';

  constructor() {
    // Use the provided account credentials
    this.accountId = 'fe95c12e-e376-46f7-aa4c-83a8e0b2992c';
    this.accountToken = 'fe95c12e-e376-46f7-aa4c-83a8e0b2992c';
    console.log('[AutomationSystem] Gofile Service initialized with real API');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (this.rateLimitCount >= 30 && now < this.rateLimitReset) {
      const waitTime = this.rateLimitReset - now;
      console.log(`[AutomationSystem] Gofile rate limit hit, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      this.rateLimitCount = 0;
    }
    
    if (now >= this.rateLimitReset) {
      this.rateLimitCount = 0;
      this.rateLimitReset = now + 60000; // Reset after 1 minute
    }
  }

  async createFolder(folderName: string, parentFolderId?: string): Promise<ServiceResponse<string>> {
    try {
      console.log(`[AutomationSystem] Creating Gofile folder: ${folderName}`);
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      const formData = new FormData();
      formData.append('token', this.accountToken);
      formData.append('folderName', folderName);
      if (parentFolderId) {
        formData.append('parentFolderId', parentFolderId);
      }

      const response = await fetch(`${this.baseUrl}/createFolder`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 'ok') {
        console.log(`[AutomationSystem] Gofile folder created: ${result.data.id}`);
        return {
          success: true,
          data: result.data.id
        };
      } else {
        throw new Error(result.status || 'Failed to create folder');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      console.error('[AutomationSystem] Gofile folder creation error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 2000
      };
    }
  }

  async uploadFile(
    fileUrl: string, 
    fileName: string, 
    folderId?: string
  ): Promise<ServiceResponse<GofileUploadResponse>> {
    try {
      console.log(`[AutomationSystem] Uploading to Gofile: ${fileName}`);
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      // First, get the upload server
      const serverResponse = await fetch(`${this.baseUrl}/getServer`);
      const serverData = await serverResponse.json();
      
      if (serverData.status !== 'ok') {
        throw new Error('Failed to get upload server');
      }

      const uploadServer = serverData.data.server;

      // Download the file first
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }

      const fileBlob = await fileResponse.blob();

      // Prepare upload
      const formData = new FormData();
      formData.append('token', this.accountToken);
      formData.append('file', fileBlob, fileName);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      // Upload to Gofile
      const uploadResponse = await fetch(`https://${uploadServer}.gofile.io/uploadFile`, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.status === 'ok') {
        const fileData = uploadResult.data;
        const response: GofileUploadResponse = {
          downloadPage: fileData.downloadPage,
          directLink: fileData.directLink || fileData.downloadPage,
          fileId: fileData.fileId
        };

        console.log(`[AutomationSystem] File uploaded to Gofile successfully: ${fileData.fileId}`);
        
        return {
          success: true,
          data: response
        };
      } else {
        throw new Error(uploadResult.status || 'Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('[AutomationSystem] Gofile upload error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 5000
      };
    }
  }

  async deleteFile(fileId: string): Promise<ServiceResponse<boolean>> {
    try {
      console.log(`[AutomationSystem] Deleting Gofile file: ${fileId}`);
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      const formData = new FormData();
      formData.append('token', this.accountToken);
      formData.append('contentId', fileId);

      const response = await fetch(`${this.baseUrl}/deleteContent`, {
        method: 'DELETE',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 'ok') {
        console.log(`[AutomationSystem] Gofile file deleted: ${fileId}`);
        return {
          success: true,
          data: true
        };
      } else {
        throw new Error(result.status || 'Deletion failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deletion failed';
      console.error('[AutomationSystem] Gofile deletion error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 1000
      };
    }
  }

  async getAccountInfo(): Promise<ServiceResponse<{ storage: number; quota: number }>> {
    try {
      console.log('[AutomationSystem] Fetching Gofile account info');
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      const response = await fetch(`${this.baseUrl}/getAccountDetails?token=${this.accountToken}`);
      const result = await response.json();

      if (result.status === 'ok') {
        const accountInfo = {
          storage: result.data.totalSize || 0,
          quota: result.data.totalSizeLimit || 0
        };

        return {
          success: true,
          data: accountInfo
        };
      } else {
        throw new Error(result.status || 'Failed to get account info');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get account info';
      console.error('[AutomationSystem] Gofile account info error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 1000
      };
    }
  }

  getUsageStats() {
    return {
      rateLimitCount: this.rateLimitCount,
      rateLimitReset: new Date(this.rateLimitReset),
      isRateLimited: this.rateLimitCount >= 30 && Date.now() < this.rateLimitReset
    };
  }
}

export const gofileService = new GofileService();