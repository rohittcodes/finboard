export interface ApiCredentials {
  apiKey: string;
  baseUrl?: string;
  rateLimitPerMinute?: number;
}

export interface ApiProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  requiresApiKey: boolean;
  rateLimitPerMinute: number;
  supportedFeatures: ApiFeature[];
  documentationUrl: string;
}

export type ApiFeature = 
  | 'real-time-quotes'
  | 'historical-data'
  | 'company-profile'
  | 'market-news'
  | 'crypto-data'
  | 'forex-data'
  | 'indian-stocks'
  | 'us-stocks'
  | 'global-stocks';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp: Date;
  currency: string;
  exchange?: string;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  employees?: number;
  website?: string;
  country?: string;
  exchange?: string;
}

export interface MarketNews {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  publishedAt: Date;
  source: string;
  url?: string;
  symbols?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
  metadata?: Record<string, any>;
}

export interface QuoteRequest {
  symbol: string;
  exchange?: string;
}

export interface HistoricalDataRequest {
  symbol: string;
  interval: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour' | '1day' | '1week' | '1month';
  from?: Date;
  to?: Date;
  limit?: number;
}

export interface NewsRequest {
  symbols?: string[];
  category?: string;
  limit?: number;
  from?: Date;
  to?: Date;
}

export interface ApiAdapter {
  readonly provider: ApiProvider;
  
  validateCredentials(credentials: ApiCredentials): Promise<boolean>;
  
  getQuote(request: QuoteRequest, credentials: ApiCredentials): Promise<ApiResponse<StockQuote>>;
  getHistoricalData(request: HistoricalDataRequest, credentials: ApiCredentials): Promise<ApiResponse<HistoricalDataPoint[]>>;
  getCompanyProfile(symbol: string, credentials: ApiCredentials): Promise<ApiResponse<CompanyProfile>>;
  getMarketNews(request: NewsRequest, credentials: ApiCredentials): Promise<ApiResponse<MarketNews[]>>;
  
  searchSymbols(query: string, credentials: ApiCredentials): Promise<ApiResponse<string[]>>;
  getSupportedSymbols(credentials: ApiCredentials): Promise<ApiResponse<string[]>>;
}

export interface UserApiConfig {
  id: string;
  providerId: string;
  name: string;
  credentials: ApiCredentials;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  preferences?: {
    defaultSymbols?: string[];
    refreshInterval?: number;
    enableNotifications?: boolean;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public resetAt: Date,
    public remaining: number = 0
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Invalid API credentials') {
    super(message, 'AUTHENTICATION_FAILED', 401);
    this.name = 'AuthenticationError';
  }
}

