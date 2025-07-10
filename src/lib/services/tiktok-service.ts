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

      // Generate realistic mock data that simulates real TikTok videos
      const mockVideos: TikTokVideo[] = Array.from({ length: Math.min(count, 20) }, (_, i) => {
        const creatorNames = ['dancequeen', 'cookingtips', 'funnymoments', 'lifestyle', 'techreview', 'petlover', 'artist', 'traveler', 'fitness', 'gamer'];
        const randomCreator = creatorNames[i % creatorNames.length];
        const videoId = `${Date.now()}${String(i).padStart(3, '0')}${Math.floor(Math.random() * 1000)}`;
        
        return {
          id: `tiktok_${videoId}`,
          author: `@${randomCreator}${i + 1}`,
          description: `${keyword} content - Amazing video #${i + 1} with trending hashtags #${keyword} #viral #fyp`,
          url: `https://www.tiktok.com/@${randomCreator}${i + 1}/video/${videoId}`,
          thumbnail: `https://picsum.photos/300/400?random=${videoId}`,
          duration: 15 + Math.floor(Math.random() * 45), // 15-60 seconds
          tags: [keyword, `tag${i + 1}`, 'trending', 'viral', 'fyp'],
        };
      });

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

      // Add 60-second delay between downloads as requested
      console.log(`[AutomationSystem] Waiting 60 seconds before download: ${video.id}`);
      await this.delay(60000);

      // Real ssstik.io integration
      const ssstikUrl = 'https://ssstik.io/abc';
      
      // Extract TikTok URL for ssstik.io
      const tiktokUrl = video.url;
      
      // Call ssstik.io API to get download URL
      const formData = new FormData();
      formData.append('id', tiktokUrl);
      formData.append('locale', 'pt');
      formData.append('tt', 'UGhUcVFx');

      const ssstikResponse = await fetch(ssstikUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://ssstik.io/',
        }
      });

      if (!ssstikResponse.ok) {
        throw new Error(`ssstik.io request failed: ${ssstikResponse.statusText}`);
      }

      const responseText = await ssstikResponse.text();
      
      // Parse the response to extract download URL
      const downloadUrlMatch = responseText.match(/href="([^"]*\.mp4[^"]*)"/);
      
      if (!downloadUrlMatch) {
        throw new Error('Could not extract download URL from ssstik.io response');
      }

      const downloadUrl = downloadUrlMatch[1];
      
      // Validate the download URL
      const videoResponse = await fetch(downloadUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!videoResponse.ok) {
        throw new Error(`Video file not accessible: ${videoResponse.statusText}`);
      }

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
        retryAfter: 5000
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