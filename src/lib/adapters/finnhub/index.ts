// Finnhub API Adapter
// Documentation: https://finnhub.io/docs/api/

import { 
    ApiProvider, 
    ApiCredentials, 
    ApiResponse, 
    StockQuote, 
    HistoricalDataPoint, 
    CompanyProfile, 
    MarketNews,
    QuoteRequest,
    HistoricalDataRequest,
    NewsRequest,
    ApiError
  } from '@/types/api';
  import { BaseApiAdapter } from '../base';
  
  export class FinnhubAdapter extends BaseApiAdapter {
    readonly provider: ApiProvider = {
      id: 'finnhub',
      name: 'Finnhub',
      description: 'Real-time stock prices, company fundamentals, and market news',
      baseUrl: 'https://finnhub.io/api/v1',
      requiresApiKey: true,
      rateLimitPerMinute: 60, // Free tier: 60 requests per minute
      supportedFeatures: [
        'real-time-quotes',
        'historical-data',
        'company-profile',
        'market-news',
        'crypto-data',
        'forex-data',
        'us-stocks',
        'global-stocks'
      ],
      documentationUrl: 'https://finnhub.io/docs/api/'
    };
  
    protected getAuthHeaders(credentials: ApiCredentials): Record<string, string> {
      return {
        'X-Finnhub-Token': credentials.apiKey
      };
    }
  
    protected transformResponse<T>(data: any): T {
      return data as T;
    }
  
    async validateCredentials(credentials: ApiCredentials): Promise<boolean> {
      try {
        const url = this.buildUrl(this.provider.baseUrl + '/quote', '', {
          symbol: 'AAPL'
        });
        
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
        
        if (response.status === 401 || response.status === 403) {
          return false;
        }
        
        const data = await response.json();
        return response.ok && data.c !== undefined; // 'c' is current price
      } catch {
        return false;
      }
    }
  
    async getQuote(request: QuoteRequest, credentials: ApiCredentials): Promise<ApiResponse<StockQuote>> {
      const url = this.buildUrl(this.provider.baseUrl + '/quote', '', {
        symbol: this.validateSymbol(request.symbol)
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (data.error) {
          throw new ApiError(data.error, 'API_ERROR');
        }
  
        // Check if we got valid data
        if (data.c === 0 && data.h === 0 && data.l === 0) {
          throw new ApiError('No data available for symbol', 'NO_DATA');
        }
  
        const stockQuote: StockQuote = {
          symbol: request.symbol.toUpperCase(),
          price: data.c, // current price
          change: data.d, // change
          changePercent: data.dp, // change percent
          high: data.h, // high price of the day
          low: data.l, // low price of the day
          open: data.o, // open price of the day
          previousClose: data.pc, // previous close price
          timestamp: new Date(data.t * 1000), // timestamp in seconds
          currency: 'USD', // Finnhub primarily provides USD prices
        };
  
        return {
          success: true,
          data: stockQuote,
          rateLimit: this.extractRateLimitInfo(response)
        };
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch quote'
        };
      }
    }
  
    async getHistoricalData(
      request: HistoricalDataRequest, 
      credentials: ApiCredentials
    ): Promise<ApiResponse<HistoricalDataPoint[]>> {
      // Finnhub uses different endpoints for different resolutions
      const resolutionMap: Record<string, string> = {
        '1min': '1',
        '5min': '5',
        '15min': '15',
        '30min': '30',
        '1hour': '60',
        '1day': 'D',
        '1week': 'W',
        '1month': 'M'
      };
  
      const resolution = resolutionMap[request.interval];
      if (!resolution) {
        return {
          success: false,
          error: `Unsupported interval: ${request.interval}`
        };
      }
  
      // Calculate date range
      const to = request.to || new Date();
      const from = request.from || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  
      const url = this.buildUrl(this.provider.baseUrl + '/stock/candle', '', {
        symbol: this.validateSymbol(request.symbol),
        resolution,
        from: Math.floor(from.getTime() / 1000),
        to: Math.floor(to.getTime() / 1000)
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (data.s === 'no_data') {
          throw new ApiError('No historical data available', 'NO_DATA');
        }
  
        if (data.s !== 'ok') {
          throw new ApiError('Failed to fetch data', 'API_ERROR');
        }
  
        const historicalData: HistoricalDataPoint[] = data.t.map((timestamp: number, index: number) => ({
          timestamp: new Date(timestamp * 1000),
          open: data.o[index],
          high: data.h[index],
          low: data.l[index],
          close: data.c[index],
          volume: data.v[index]
        }));
  
        // Apply limit if specified
        const finalData = request.limit 
          ? historicalData.slice(-request.limit)
          : historicalData;
  
        return {
          success: true,
          data: finalData,
          rateLimit: this.extractRateLimitInfo(response)
        };
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch historical data'
        };
      }
    }
  
    async getCompanyProfile(symbol: string, credentials: ApiCredentials): Promise<ApiResponse<CompanyProfile>> {
      const url = this.buildUrl(this.provider.baseUrl + '/stock/profile2', '', {
        symbol: this.validateSymbol(symbol)
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (!data.name) {
          throw new ApiError('No company data available', 'NO_DATA');
        }
  
        const profile: CompanyProfile = {
          symbol: symbol.toUpperCase(),
          name: data.name,
          description: data.description,
          sector: data.finnhubIndustry,
          industry: data.finnhubIndustry,
          marketCap: data.marketCapitalization,
          employees: data.employeeTotal,
          website: data.weburl,
          country: data.country,
          exchange: data.exchange
        };
  
        return {
          success: true,
          data: profile,
          rateLimit: this.extractRateLimitInfo(response)
        };
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch company profile'
        };
      }
    }
  
    async getMarketNews(request: NewsRequest, credentials: ApiCredentials): Promise<ApiResponse<MarketNews[]>> {
      // Use company news if symbols are specified, otherwise general news
      const endpoint = request.symbols?.length 
        ? '/company-news' 
        : '/news';
  
      const params: any = {
        category: request.category || 'general',
        minId: 0
      };
  
      if (request.symbols?.length) {
        params.symbol = request.symbols[0]; // Finnhub only supports one symbol at a time
        params.from = this.formatDate(request.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        params.to = this.formatDate(request.to || new Date());
      }
  
      const url = this.buildUrl(this.provider.baseUrl + endpoint, '', params);
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const articles = await response.json();
  
        const news: MarketNews[] = articles
          .slice(0, request.limit || 50)
          .map((article: any) => ({
            id: `fh-${article.id}`,
            title: article.headline,
            summary: article.summary,
            publishedAt: new Date(article.datetime * 1000),
            source: article.source,
            url: article.url,
            symbols: request.symbols || [],
            sentiment: this.mapSentiment(article.sentiment)
          }));
  
        return {
          success: true,
          data: news,
          rateLimit: this.extractRateLimitInfo(response)
        };
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch news'
        };
      }
    }
  
    async searchSymbols(query: string, credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      const url = this.buildUrl(this.provider.baseUrl + '/search', '', {
        q: query
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
        const symbols = data.result?.map((item: any) => item.symbol) || [];
  
        return {
          success: true,
          data: symbols,
          rateLimit: this.extractRateLimitInfo(response)
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search symbols'
        };
      }
    }
  
    async getSupportedSymbols(_credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      // Finnhub doesn't provide a comprehensive list endpoint
      // Return empty array - users will need to search for specific symbols
      return {
        success: true,
        data: []
      };
    }
  
    private mapSentiment(sentiment?: number): 'positive' | 'negative' | 'neutral' {
      if (!sentiment) return 'neutral';
      if (sentiment > 0) return 'positive';
      if (sentiment < 0) return 'negative';
      return 'neutral';
    }
  
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
  }
  
  