export interface TikTokVideo {
  id: string;
  author: string;
  description: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  tags: string[];
  downloadUrl?: string;
}

export interface AutomationConfig {
  keyword: string;
  videoCount: number;
  youtubeChannel: {
    title: string;
    description: string;
    tags: string[];
    category: string;
    privacy: 'private' | 'public' | 'unlisted';
  };
  filters: {
    minDuration?: number;
    maxDuration?: number;
    excludeKeywords?: string[];
  };
}

export interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  progress?: number;
  timestamp?: Date;
  error?: string;
}

export interface AutomationSession {
  id: string;
  config: AutomationConfig;
  steps: ProcessingStep[];
  videos: TikTokVideo[];
  status: 'idle' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  results: {
    videosCollected: number;
    videosDownloaded: number;
    videosUploaded: number;
    errors: string[];
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryAfter?: number;
}

export interface GofileUploadResponse {
  downloadPage: string;
  directLink: string;
  fileId: string;
}

export interface YouTubeUploadResponse {
  videoId: string;
  url: string;
  status: string;
}