// Alpha Vantage API Adapter
// Documentation: https://www.alphavantage.co/documentation/

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
  
  export class AlphaVantageAdapter extends BaseApiAdapter {
    readonly provider: ApiProvider = {
      id: 'alpha-vantage',
      name: 'Alpha Vantage',
      description: 'Real-time and historical stock market data, forex, and cryptocurrency data',
      baseUrl: 'https://www.alphavantage.co',
      requiresApiKey: true,
      rateLimitPerMinute: 5, // Free tier: 5 requests per minute
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
      documentationUrl: 'https://www.alphavantage.co/documentation/'
    };
  
    protected getAuthHeaders(_credentials: ApiCredentials): Record<string, string> {
      // Alpha Vantage uses API key in query params, not headers
      return {};
    }
  
    protected transformResponse<T>(data: any): T {
      return data as T;
    }
  
    async validateCredentials(credentials: ApiCredentials): Promise<boolean> {
      try {
        const url = this.buildUrl(this.provider.baseUrl + '/query', '', {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: credentials.apiKey
        });
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Check for error message or valid response
        return !data['Error Message'] && !data['Note'] && data['Global Quote'];
      } catch {
        return false;
      }
    }
  
    async getQuote(request: QuoteRequest, credentials: ApiCredentials): Promise<ApiResponse<StockQuote>> {
      const url = this.buildUrl(this.provider.baseUrl + '/query', '', {
        function: 'GLOBAL_QUOTE',
        symbol: this.validateSymbol(request.symbol),
        apikey: credentials.apiKey
      });
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data['Error Message']) {
          throw new ApiError(data['Error Message'], 'INVALID_SYMBOL');
        }
  
        if (data['Note']) {
          throw new ApiError('API call frequency limit reached', 'RATE_LIMIT_EXCEEDED');
        }
  
        const quote = data['Global Quote'];
        if (!quote) {
          throw new ApiError('No data available for symbol', 'NO_DATA');
        }
  
        const stockQuote: StockQuote = {
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          open: parseFloat(quote['02. open']),
          previousClose: parseFloat(quote['08. previous close']),
          timestamp: new Date(quote['07. latest trading day']),
          currency: 'USD', // Alpha Vantage primarily provides USD prices
        };
  
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
      // Map interval to Alpha Vantage function
      const functionMap: Record<string, string> = {
        '1min': 'TIME_SERIES_INTRADAY',
        '5min': 'TIME_SERIES_INTRADAY',
        '15min': 'TIME_SERIES_INTRADAY',
        '30min': 'TIME_SERIES_INTRADAY',
        '1hour': 'TIME_SERIES_INTRADAY',
        '1day': 'TIME_SERIES_DAILY',
        '1week': 'TIME_SERIES_WEEKLY',
        '1month': 'TIME_SERIES_MONTHLY'
      };
  
      const func = functionMap[request.interval];
      if (!func) {
        return {
          success: false,
          error: `Unsupported interval: ${request.interval}`
        };
      }
  
      const params: any = {
        function: func,
        symbol: this.validateSymbol(request.symbol),
        apikey: credentials.apiKey
      };
  
      // Add interval for intraday data
      if (func === 'TIME_SERIES_INTRADAY') {
        params.interval = request.interval;
      }
  
      const url = this.buildUrl(this.provider.baseUrl + '/query', '', params);
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data['Error Message']) {
          throw new ApiError(data['Error Message'], 'INVALID_SYMBOL');
        }
  
        // Find the time series data key
        const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
        if (!timeSeriesKey || !data[timeSeriesKey]) {
          throw new ApiError('No historical data available', 'NO_DATA');
        }
  
        const timeSeriesData = data[timeSeriesKey];
        const historicalData: HistoricalDataPoint[] = Object.entries(timeSeriesData)
          .map(([timestamp, values]: [string, any]) => ({
            timestamp: new Date(timestamp),
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'] || '0')
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
        // Apply date filtering if specified
        let filteredData = historicalData;
        if (request.from) {
          filteredData = filteredData.filter(point => point.timestamp >= request.from!);
        }
        if (request.to) {
          filteredData = filteredData.filter(point => point.timestamp <= request.to!);
        }
        if (request.limit) {
          filteredData = filteredData.slice(-request.limit);
        }
  
        return {
          success: true,
          data: filteredData
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
      const url = this.buildUrl(this.provider.baseUrl + '/query', '', {
        function: 'OVERVIEW',
        symbol: this.validateSymbol(symbol),
        apikey: credentials.apiKey
      });
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data['Error Message']) {
          throw new ApiError(data['Error Message'], 'INVALID_SYMBOL');
        }
  
        if (!data.Symbol) {
          throw new ApiError('No company data available', 'NO_DATA');
        }
  
        const profile: CompanyProfile = {
          symbol: data.Symbol,
          name: data.Name,
          description: data.Description,
          sector: data.Sector,
          industry: data.Industry,
          marketCap: data.MarketCapitalization ? parseInt(data.MarketCapitalization) : undefined,
          employees: data.FullTimeEmployees ? parseInt(data.FullTimeEmployees) : undefined,
          website: data.OfficialSite,
          country: data.Country,
          exchange: data.Exchange
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
  
    async getMarketNews(request: NewsRequest, credentials: ApiCredentials): Promise<ApiResponse<MarketNews[]>> {
      const url = this.buildUrl(this.provider.baseUrl + '/query', '', {
        function: 'NEWS_SENTIMENT',
        tickers: request.symbols?.join(','),
        limit: request.limit || 50,
        apikey: credentials.apiKey
      });
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data['Error Message']) {
          throw new ApiError(data['Error Message'], 'API_ERROR');
        }
  
        const articles = data.feed || [];
        const news: MarketNews[] = articles.map((article: any, index: number) => ({
          id: `av-${index}-${Date.now()}`,
          title: article.title,
          summary: article.summary,
          publishedAt: new Date(article.time_published),
          source: article.source,
          url: article.url,
          symbols: article.ticker_sentiment?.map((t: any) => t.ticker) || [],
          sentiment: this.mapSentiment(article.overall_sentiment_score)
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
      const url = this.buildUrl(this.provider.baseUrl + '/query', '', {
        function: 'SYMBOL_SEARCH',
        keywords: query,
        apikey: credentials.apiKey
      });
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data['Error Message']) {
          throw new ApiError(data['Error Message'], 'API_ERROR');
        }
  
        const matches = data.bestMatches || [];
        const symbols = matches.map((match: any) => match['1. symbol']);
  
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
  
    async getSupportedSymbols(_credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      // Alpha Vantage doesn't provide a comprehensive list endpoint
      // Return empty array - users will need to search for specific symbols
      return {
        success: true,
        data: []
      };
    }
  
    private mapSentiment(score: number): 'positive' | 'negative' | 'neutral' {
      if (score > 0.1) return 'positive';
      if (score < -0.1) return 'negative';
      return 'neutral';
    }
  }
  
  