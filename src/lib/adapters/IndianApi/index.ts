// IndianAPI Stock Market Adapter
// Documentation: https://indianapi.in/indian-stock-market

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
  
  export class IndianApiAdapter extends BaseApiAdapter {
    readonly provider: ApiProvider = {
      id: 'indian-api',
      name: 'Indian API',
      description: 'Indian stock market data including NSE and BSE stocks',
      baseUrl: 'https://indianapi.in',
      requiresApiKey: true,
      rateLimitPerMinute: 100, // Assumed rate limit
      supportedFeatures: [
        'real-time-quotes',
        'historical-data',
        'company-profile',
        'indian-stocks'
      ],
      documentationUrl: 'https://indianapi.in/documentation/indian-stock-market'
    };
  
    protected getAuthHeaders(credentials: ApiCredentials): Record<string, string> {
      return {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      };
    }
  
    protected transformResponse<T>(data: any): T {
      return data as T;
    }
  
    async validateCredentials(credentials: ApiCredentials): Promise<boolean> {
      try {
        const url = this.buildUrl(this.provider.baseUrl + '/stock', '', {
          name: 'RELIANCE'
        });
        
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
        
        if (response.status === 401 || response.status === 403) {
          return false;
        }
        
        const data = await response.json();
        return data.tickerId !== undefined;
      } catch {
        return false;
      }
    }
  
  async getQuote(request: QuoteRequest, credentials: ApiCredentials): Promise<ApiResponse<StockQuote>> {
    const url = this.buildUrl(this.provider.baseUrl + '/stock', '', {
      name: this.validateSymbol(request.symbol)
    });

    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(credentials)
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new ApiError('Stock not found', 'INVALID_SYMBOL');
        }
        throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
      }

      const data = await response.json();

      if (!data.tickerId) {
        throw new ApiError('No data available for symbol', 'NO_DATA');
      }

      const currentPrice = data.currentPrice?.NSE || data.currentPrice?.BSE;
      if (!currentPrice) {
        throw new ApiError('No price data available', 'NO_DATA');
      }

      const stockQuote: StockQuote = {
        symbol: data.tickerId || request.symbol.toUpperCase(),
        price: currentPrice,
        change: 0,
        changePercent: data.percentChange || 0,
        volume: 0,
        high: data.yearHigh || 0,
        low: data.yearLow || 0,
        open: currentPrice,
        previousClose: currentPrice * (1 - (data.percentChange || 0) / 100),
        timestamp: new Date(),
        currency: 'INR',
        exchange: data.currentPrice?.NSE ? 'NSE' : 'BSE'
      };

      if (data.percentChange) {
        stockQuote.change = (stockQuote.price * data.percentChange) / 100;
      }

      return {
        success: true,
        data: stockQuote
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
      const intervalMap: Record<string, string> = {
        '1min': '1m',
        '5min': '5m',
        '15min': '15m',
        '30min': '30m',
        '1hour': '1h',
        '1day': '1d',
        '1week': '1w',
        '1month': '1M'
      };
  
      const interval = intervalMap[request.interval];
      if (!interval) {
        return {
          success: false,
          error: `Unsupported interval: ${request.interval}`
        };
      }
  
      const params: any = {
        symbol: this.validateSymbol(request.symbol),
        interval,
      };
  
      if (request.from) {
        params.from = this.formatDate(request.from);
      }
      if (request.to) {
        params.to = this.formatDate(request.to);
      }
      if (request.limit) {
        params.limit = request.limit;
      }
  
      const url = this.buildUrl(this.provider.baseUrl + '/historical', '', params);
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (!data.success) {
          throw new ApiError(data.message || 'No historical data available', 'NO_DATA');
        }
  
        const historicalData: HistoricalDataPoint[] = (data.data || []).map((item: any) => ({
          timestamp: new Date(item.date || item.timestamp),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume || '0')
        }));
  
        return {
          success: true,
          data: historicalData
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
      const url = this.buildUrl(this.provider.baseUrl + '/company', '', {
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
  
        if (!data.success || !data.data) {
          throw new ApiError('No company data available', 'NO_DATA');
        }
  
        const companyData = data.data;
        const profile: CompanyProfile = {
          symbol: symbol.toUpperCase(),
          name: companyData.companyName || companyData.name,
          description: companyData.description || companyData.businessDescription,
          sector: companyData.sector,
          industry: companyData.industry,
          marketCap: companyData.marketCap ? parseFloat(companyData.marketCap) : undefined,
          employees: companyData.employees ? parseInt(companyData.employees) : undefined,
          website: companyData.website,
          country: 'India',
          exchange: companyData.exchange || 'NSE'
        };
  
        return {
          success: true,
          data: profile
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
  
    async getMarketNews(_request: NewsRequest, credentials: ApiCredentials): Promise<ApiResponse<MarketNews[]>> {
      const url = this.buildUrl(this.provider.baseUrl + '/news', '', {
        category: 'market',
        limit: _request.limit || 20
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (!data.success) {
          throw new ApiError('Failed to fetch news', 'API_ERROR');
        }
  
        const articles = data.data || [];
        const news: MarketNews[] = articles.map((article: any, index: number) => ({
          id: `ia-${index}-${Date.now()}`,
          title: article.title || article.headline,
          summary: article.summary || article.description,
          publishedAt: new Date(article.publishedAt || article.date || Date.now()),
          source: article.source || 'Indian Market',
          url: article.url || article.link,
          symbols: article.symbols || [],
          sentiment: 'neutral'
        }));
  
        return {
          success: true,
          data: news
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
        q: query,
        limit: 50
      });
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const data = await response.json();
  
        if (!data.success) {
          throw new ApiError('Search failed', 'API_ERROR');
        }
  
        const symbols = (data.data || []).map((item: any) => item.symbol || item.code);
  
        return {
          success: true,
          data: symbols
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search symbols'
        };
      }
    }
  
    async getSupportedSymbols(credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      const url = this.buildUrl(this.provider.baseUrl + '/symbols', '');
  
      try {
        const response = await fetch(url, {
          headers: this.getAuthHeaders(credentials)
        });
  
        if (!response.ok) {
          return {
            success: true,
            data: [] // Return empty if endpoint not available
          };
        }
  
        const data = await response.json();
        const symbols = (data.data || []).map((item: any) => item.symbol || item.code);
  
        return {
          success: true,
          data: symbols
        };
      } catch {
        return {
          success: true,
          data: [] // Return empty on error
        };
      }
    }
  }
  
  