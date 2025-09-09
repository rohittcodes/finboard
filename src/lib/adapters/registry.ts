import { ApiAdapter, ApiProvider, UserApiConfig } from '@/types/api';
import { AlphaVantageAdapter } from './alphaVantage';
import { FinnhubAdapter } from './finnhub';
import { IndianApiAdapter } from './IndianApi';

export class ApiAdapterRegistry {
  private static adapters: Map<string, () => ApiAdapter> = new Map();
  private static providers: Map<string, ApiProvider> = new Map();

  static {
    this.register('alpha-vantage', () => new AlphaVantageAdapter());
    this.register('finnhub', () => new FinnhubAdapter());
    this.register('indian-api', () => new IndianApiAdapter());
  }

  /**
   * Register a new adapter
   */
  static register(id: string, factory: () => ApiAdapter): void {
    this.adapters.set(id, factory);
    const adapter = factory();
    this.providers.set(id, adapter.provider);
  }

  /**
   * Create an adapter instance by provider ID
   */
  static createAdapter(providerId: string): ApiAdapter | null {
    const factory = this.adapters.get(providerId);
    return factory ? factory() : null;
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): ApiProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get a specific provider by ID
   */
  static getProvider(providerId: string): ApiProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Check if a provider is supported
   */
  static isSupported(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  /**
   * Get providers that support a specific feature
   */
  static getProvidersByFeature(feature: string): ApiProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.supportedFeatures.includes(feature as any));
  }
}

export class ApiAdapterFactory {
  private static instances: Map<string, ApiAdapter> = new Map();

  /**
   * Get or create an adapter instance for a user configuration
   */
  static getAdapter(config: UserApiConfig): ApiAdapter | null {
    const cacheKey = `${config.providerId}-${config.id}`;
    
    // Return cached instance if available
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Create new instance
    const adapter = ApiAdapterRegistry.createAdapter(config.providerId);
    if (adapter) {
      this.instances.set(cacheKey, adapter);
    }

    return adapter;
  }

  /**
   * Clear cached adapter instance
   */
  static clearCache(configId?: string): void {
    if (configId) {
      // Clear specific config
      for (const [key] of this.instances) {
        if (key.endsWith(`-${configId}`)) {
          this.instances.delete(key);
          break;
        }
      }
    } else {
      // Clear all cached instances
      this.instances.clear();
    }
  }

  /**
   * Validate credentials for a provider
   */
  static async validateCredentials(providerId: string, credentials: any): Promise<boolean> {
    const adapter = ApiAdapterRegistry.createAdapter(providerId);
    if (!adapter) {
      throw new Error(`Unsupported provider: ${providerId}`);
    }

    return adapter.validateCredentials(credentials);
  }

  /**
   * Test connection with a sample request
   */
  static async testConnection(config: UserApiConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const adapter = this.getAdapter(config);
      if (!adapter) {
        return { success: false, error: 'Adapter not found' };
      }

      const testSymbol = config.providerId === 'indian-api' ? 'RELIANCE' : 'AAPL';
      const result = await adapter.getQuote({ symbol: testSymbol }, config.credentials);
      
      return { success: result.success, error: result.error };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

export class AdapterUtils {
  /**
   * Get recommended providers based on user preferences
   */
  static getRecommendedProviders(preferences?: {
    region?: 'us' | 'india' | 'global';
    features?: string[];
    budget?: 'free' | 'paid';
  }): ApiProvider[] {
    let providers = ApiAdapterRegistry.getAllProviders();

    if (preferences?.region) {
      providers = providers.filter(provider => {
        switch (preferences.region) {
          case 'us':
            return provider.supportedFeatures.includes('us-stocks');
          case 'india':
            return provider.supportedFeatures.includes('indian-stocks');
          case 'global':
            return provider.supportedFeatures.includes('global-stocks');
          default:
            return true;
        }
      });
    }

    if (preferences?.features) {
      providers = providers.filter(provider =>
        preferences.features!.some(feature =>
          provider.supportedFeatures.includes(feature as any)
        )
      );
    }

    // Sort by rate limits (higher is better for free tier)
    return providers.sort((a, b) => b.rateLimitPerMinute - a.rateLimitPerMinute);
  }

  /**
   * Format provider information for display
   */
  static formatProviderInfo(provider: ApiProvider): {
    name: string;
    description: string;
    features: string;
    rateLimit: string;
    documentation: string;
  } {
    return {
      name: provider.name,
      description: provider.description,
      features: provider.supportedFeatures.join(', '),
      rateLimit: `${provider.rateLimitPerMinute} requests/minute`,
      documentation: provider.documentationUrl
    };
  }

  /**
   * Check if all required features are supported by a provider
   */
  static supportsAllFeatures(providerId: string, requiredFeatures: string[]): boolean {
    const provider = ApiAdapterRegistry.getProvider(providerId);
    if (!provider) return false;

    return requiredFeatures.every(feature =>
      provider.supportedFeatures.includes(feature as any)
    );
  }

  /**
   * Get the best provider for specific requirements
   */
  static getBestProvider(requirements: {
    features: string[];
    minRateLimit?: number;
    region?: 'us' | 'india' | 'global';
  }): ApiProvider | null {
    const providers = this.getRecommendedProviders({
      region: requirements.region,
      features: requirements.features
    });

    const suitableProviders = providers.filter(provider => {
      const supportsFeatures = requirements.features.every(feature =>
        provider.supportedFeatures.includes(feature as any)
      );
      const meetsRateLimit = !requirements.minRateLimit ||
        provider.rateLimitPerMinute >= requirements.minRateLimit;
      
      return supportsFeatures && meetsRateLimit;
    });

    return suitableProviders.length > 0 ? suitableProviders[0] : null;
  }
}

export default ApiAdapterRegistry;
