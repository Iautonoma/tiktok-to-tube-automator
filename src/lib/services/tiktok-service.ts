import { TikTokVideo, ServiceResponse } from '@/lib/types/automation';

class TikTokService {
  private apiKey: string | null = null;
  private rateLimitCount = 0;
  private rateLimitReset = 0;

  constructor() {
    console.log('[AutomationSystem] TikTok Service initialized');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    if (this.rateLimitCount >= 60 && now < this.rateLimitReset) {
      const waitTime = this.rateLimitReset - now;
      console.log(`[AutomationSystem] Rate limit hit, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      this.rateLimitCount = 0;
    }
    
    if (now >= this.rateLimitReset) {
      this.rateLimitCount = 0;
      this.rateLimitReset = now + 60000; // Reset after 1 minute
    }
  }

  async searchVideos(
    keyword: string, 
    count: number = 10,
    filters?: {
      minDuration?: number;
      maxDuration?: number;
      excludeKeywords?: string[];
    }
  ): Promise<ServiceResponse<TikTokVideo[]>> {
    try {
      console.log(`[AutomationSystem] Searching TikTok videos for: ${keyword}`);
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      // Simulate API call with realistic delay
      await this.delay(1000 + Math.random() * 2000);

      // Mock data for development
      const mockVideos: TikTokVideo[] = Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        id: `tiktok_${Date.now()}_${i}`,
        author: `@creator${i + 1}`,
        description: `Amazing ${keyword} video #${i + 1} with trending content`,
        url: `https://www.tiktok.com/@creator${i + 1}/video/${Date.now()}${i}`,
        thumbnail: `https://picsum.photos/300/400?random=${i}`,
        duration: 15 + Math.floor(Math.random() * 45), // 15-60 seconds
        tags: [keyword, `tag${i + 1}`, 'trending', 'viral'],
      }));

      // Apply filters
      let filteredVideos = mockVideos;
      
      if (filters?.minDuration) {
        filteredVideos = filteredVideos.filter(v => (v.duration || 0) >= filters.minDuration!);
      }
      
      if (filters?.maxDuration) {
        filteredVideos = filteredVideos.filter(v => (v.duration || 0) <= filters.maxDuration!);
      }
      
      if (filters?.excludeKeywords) {
        filteredVideos = filteredVideos.filter(v => 
          !filters.excludeKeywords!.some(excluded => 
            v.description.toLowerCase().includes(excluded.toLowerCase()) ||
            v.tags.some(tag => tag.toLowerCase().includes(excluded.toLowerCase()))
          )
        );
      }

      console.log(`[AutomationSystem] Found ${filteredVideos.length} videos for keyword: ${keyword}`);
      
      return {
        success: true,
        data: filteredVideos.slice(0, count)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[AutomationSystem] TikTok search error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 5000
      };
    }
  }

  async downloadVideo(video: TikTokVideo): Promise<ServiceResponse<string>> {
    try {
      console.log(`[AutomationSystem] Downloading video: ${video.id}`);
      
      await this.checkRateLimit();
      this.rateLimitCount++;

      // Simulate download via ssstik.io
      const ssstikUrl = 'https://ssstik.io/abc';
      
      // Add realistic delay for download
      await this.delay(3000 + Math.random() * 5000);

      // Mock download URL (in real implementation, this would be from ssstik.io)
      const downloadUrl = `https://ssstik.io/download/${video.id}.mp4`;
      
      console.log(`[AutomationSystem] Video downloaded successfully: ${video.id}`);
      
      return {
        success: true,
        data: downloadUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      console.error('[AutomationSystem] Download error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        retryAfter: 3000
      };
    }
  }

  async validateVideoUrl(url: string): Promise<boolean> {
    try {
      const tiktokPattern = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/;
      return tiktokPattern.test(url);
    } catch {
      return false;
    }
  }

  getUsageStats() {
    return {
      rateLimitCount: this.rateLimitCount,
      rateLimitReset: new Date(this.rateLimitReset),
      isRateLimited: this.rateLimitCount >= 60 && Date.now() < this.rateLimitReset
    };
  }
}

export const tiktokService = new TikTokService();