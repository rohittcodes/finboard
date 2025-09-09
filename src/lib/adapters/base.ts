// Base adapter class with common functionality

import { 
  ApiAdapter, 
  ApiCredentials, 
  ApiResponse, 
  ApiError, 
  RateLimitError, 
  AuthenticationError 
} from '@/types/api';

export abstract class BaseApiAdapter implements ApiAdapter {
  abstract readonly provider: any;
  
  abstract getQuote(request: any, credentials: ApiCredentials): Promise<ApiResponse<any>>;
  abstract getHistoricalData(request: any, credentials: ApiCredentials): Promise<ApiResponse<any>>;
  abstract getCompanyProfile(symbol: string, credentials: ApiCredentials): Promise<ApiResponse<any>>;
  abstract getMarketNews(request: any, credentials: ApiCredentials): Promise<ApiResponse<any>>;
  abstract searchSymbols(query: string, credentials: ApiCredentials): Promise<ApiResponse<string[]>>;
  abstract getSupportedSymbols(credentials: ApiCredentials): Promise<ApiResponse<string[]>>;
  
  protected async makeRequest<T>(
    url: string,
    credentials: ApiCredentials,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(credentials),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle rate limiting
      if (response.status === 429) {
        const resetAt = new Date(Date.now() + 60000); // Default 1 minute
        throw new RateLimitError('Rate limit exceeded', resetAt);
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError('Invalid API credentials');
      }

      // Handle other HTTP errors
      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data = await response.json();
      
      // Extract rate limit info from headers if available
      const rateLimit = this.extractRateLimitInfo(response);

      return {
        success: true,
        data: this.transformResponse(data),
        rateLimit,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  protected abstract getAuthHeaders(credentials: ApiCredentials): Record<string, string>;
  protected abstract transformResponse<T>(data: any): T;

  protected extractRateLimitInfo(response: Response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining && reset) {
      return {
        remaining: parseInt(remaining),
        resetAt: new Date(parseInt(reset) * 1000),
      };
    }
    
    return undefined;
  }

  protected buildUrl(baseUrl: string, endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(endpoint, baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    
    return url.toString();
  }

  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  protected parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  protected validateSymbol(symbol: string): string {
    return symbol.toUpperCase().trim();
  }

  async validateCredentials(credentials: ApiCredentials): Promise<boolean> {
    try {
      // Default validation - try a simple API call
      const testUrl = this.buildUrl(credentials.baseUrl || this.provider.baseUrl, '/test');
      const response = await this.makeRequest(testUrl, credentials);
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

