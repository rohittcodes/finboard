import { 
  UserApiConfig, 
  StockQuote, 
  HistoricalDataPoint, 
  CompanyProfile, 
  MarketNews,
  QuoteRequest,
  HistoricalDataRequest,
  NewsRequest,
  ApiResponse 
} from '@/types/api';
import { ApiAdapterFactory } from './adapters';

export class FinancialApiClient {
  private static instance: FinancialApiClient;
  private configurations: Map<string, UserApiConfig> = new Map();

  private constructor() {}

  static getInstance(): FinancialApiClient {
    if (!FinancialApiClient.instance) {
      FinancialApiClient.instance = new FinancialApiClient();
    }
    return FinancialApiClient.instance;
  }

  /**
   * Load user configurations
   */
  loadConfigurations(configs: UserApiConfig[]): void {
    this.configurations.clear();
    configs.forEach(config => {
      if (config.isActive) {
        this.configurations.set(config.providerId, config);
      }
    });
  }

  /**
   * Get available provider IDs
   */
  getAvailableProviders(): string[] {
    return Array.from(this.configurations.keys());
  }

  /**
   * Get configuration for a provider
   */
  getConfiguration(providerId: string): UserApiConfig | undefined {
    return this.configurations.get(providerId);
  }

  /**
   * Fetch stock quote from the best available provider
   */
  async getStockQuote(
    symbol: string, 
    preferredProvider?: string
  ): Promise<ApiResponse<StockQuote>> {
    const providerId = preferredProvider || this.getBestProviderForFeature('real-time-quotes');
    
    if (!providerId) {
      return {
        success: false,
        error: 'No configured provider supports real-time quotes'
      };
    }

    const config = this.configurations.get(providerId);
    if (!config) {
      return {
        success: false,
        error: `Provider ${providerId} is not configured`
      };
    }

    try {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to create adapter for ${providerId}`
        };
      }

      const request: QuoteRequest = { symbol: symbol.toUpperCase() };
      const result = await adapter.getQuote(request, config.credentials);

      // Update last used timestamp
      if (result.success) {
        this.updateLastUsed(config.id);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch historical data
   */
  async getHistoricalData(
    symbol: string,
    interval: string,
    options: {
      from?: Date;
      to?: Date;
      limit?: number;
      preferredProvider?: string;
    } = {}
  ): Promise<ApiResponse<HistoricalDataPoint[]>> {
    const providerId = options.preferredProvider || this.getBestProviderForFeature('historical-data');
    
    if (!providerId) {
      return {
        success: false,
        error: 'No configured provider supports historical data'
      };
    }

    const config = this.configurations.get(providerId);
    if (!config) {
      return {
        success: false,
        error: `Provider ${providerId} is not configured`
      };
    }

    try {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to create adapter for ${providerId}`
        };
      }

      const request: HistoricalDataRequest = {
        symbol: symbol.toUpperCase(),
        interval: interval as any,
        from: options.from,
        to: options.to,
        limit: options.limit
      };

      const result = await adapter.getHistoricalData(request, config.credentials);

      if (result.success) {
        this.updateLastUsed(config.id);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch company profile
   */
  async getCompanyProfile(
    symbol: string,
    preferredProvider?: string
  ): Promise<ApiResponse<CompanyProfile>> {
    const providerId = preferredProvider || this.getBestProviderForFeature('company-profile');
    
    if (!providerId) {
      return {
        success: false,
        error: 'No configured provider supports company profiles'
      };
    }

    const config = this.configurations.get(providerId);
    if (!config) {
      return {
        success: false,
        error: `Provider ${providerId} is not configured`
      };
    }

    try {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to create adapter for ${providerId}`
        };
      }

      const result = await adapter.getCompanyProfile(symbol.toUpperCase(), config.credentials);

      if (result.success) {
        this.updateLastUsed(config.id);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch market news
   */
  async getMarketNews(
    options: {
      symbols?: string[];
      category?: string;
      limit?: number;
      from?: Date;
      to?: Date;
      preferredProvider?: string;
    } = {}
  ): Promise<ApiResponse<MarketNews[]>> {
    const providerId = options.preferredProvider || this.getBestProviderForFeature('market-news');
    
    if (!providerId) {
      return {
        success: false,
        error: 'No configured provider supports market news'
      };
    }

    const config = this.configurations.get(providerId);
    if (!config) {
      return {
        success: false,
        error: `Provider ${providerId} is not configured`
      };
    }

    try {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to create adapter for ${providerId}`
        };
      }

      const request: NewsRequest = {
        symbols: options.symbols,
        category: options.category,
        limit: options.limit,
        from: options.from,
        to: options.to
      };

      const result = await adapter.getMarketNews(request, config.credentials);

      if (result.success) {
        this.updateLastUsed(config.id);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(
    query: string,
    preferredProvider?: string
  ): Promise<ApiResponse<string[]>> {
    const providerId = preferredProvider || Array.from(this.configurations.keys())[0];
    
    if (!providerId) {
      return {
        success: false,
        error: 'No configured providers available'
      };
    }

    const config = this.configurations.get(providerId);
    if (!config) {
      return {
        success: false,
        error: `Provider ${providerId} is not configured`
      };
    }

    try {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (!adapter) {
        return {
          success: false,
          error: `Failed to create adapter for ${providerId}`
        };
      }

      const result = await adapter.searchSymbols(query, config.credentials);

      if (result.success) {
        this.updateLastUsed(config.id);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get multiple quotes in parallel
   */
  async getMultipleQuotes(
    symbols: string[],
    preferredProvider?: string
  ): Promise<Map<string, ApiResponse<StockQuote>>> {
    const results = new Map<string, ApiResponse<StockQuote>>();
    
    // Fetch all quotes in parallel
    const promises = symbols.map(async (symbol) => {
      const result = await this.getStockQuote(symbol, preferredProvider);
      return { symbol, result };
    });

    const responses = await Promise.allSettled(promises);
    
    responses.forEach((response) => {
      if (response.status === 'fulfilled') {
        results.set(response.value.symbol, response.value.result);
      } else {
        results.set('unknown', {
          success: false,
          error: 'Failed to fetch quote'
        });
      }
    });

    return results;
  }

  /**
   * Find the best provider for a specific feature
   */
  private getBestProviderForFeature(feature: string): string | null {
    for (const [providerId, config] of this.configurations) {
      const adapter = ApiAdapterFactory.getAdapter(config);
      if (adapter && adapter.provider.supportedFeatures.includes(feature as any)) {
        return providerId;
      }
    }
    return null;
  }

  /**
   * Update the last used timestamp for a configuration
   */
  private updateLastUsed(configId: string): void {
    const savedConfigs = localStorage.getItem('finboard-api-configs');
    if (savedConfigs) {
      try {
        const configs: UserApiConfig[] = JSON.parse(savedConfigs);
        const updated = configs.map(config => 
          config.id === configId 
            ? { ...config, lastUsed: new Date() }
            : config
        );
        localStorage.setItem('finboard-api-configs', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to update last used timestamp:', error);
      }
    }
  }
}

export const apiClient = FinancialApiClient.getInstance();
