// Dynamic Custom API Adapter

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
  import { 
    CustomApiConfiguration, 
    ApiFieldMapping, 
    ResponseTransformer,
    ValidationError, 
    CustomApiEndpoint
  } from '@/types/custom-api';
  import { BaseApiAdapter } from '../base';
  
  export class CustomApiAdapter extends BaseApiAdapter implements ResponseTransformer {
    readonly provider: ApiProvider;
    private config: CustomApiConfiguration;
  
    constructor(config: CustomApiConfiguration) {
      super();
      this.config = config;
      this.provider = {
        id: `custom-${config.id}`,
        name: config.name,
        description: config.description,
        baseUrl: config.baseUrl,
        requiresApiKey: config.authType !== 'none',
        rateLimitPerMinute: config.rateLimitPerMinute,
        supportedFeatures: this.detectSupportedFeatures(),
        documentationUrl: config.baseUrl // Fallback to base URL
      };
    }
  
    private detectSupportedFeatures(): any[] {
      const features = [];
      if (this.config.endpoints.quote) features.push('real-time-quotes');
      if (this.config.endpoints.historical) features.push('historical-data');
      if (this.config.endpoints.profile) features.push('company-profile');
      if (this.config.endpoints.news) features.push('market-news');
      return features;
    }
  
    protected getAuthHeaders(credentials: ApiCredentials): Record<string, string> {
      const headers: Record<string, string> = {};
      
      switch (this.config.authType) {
        case 'bearer_token':
          headers['Authorization'] = `${this.config.authConfig.headerPrefix || 'Bearer '}${credentials.apiKey}`;
          break;
        case 'custom_header':
          if (this.config.authConfig.headerName) {
            headers[this.config.authConfig.headerName] = 
              `${this.config.authConfig.headerPrefix || ''}${credentials.apiKey}`;
          }
          break;
        case 'basic_auth':
          const auth = btoa(`${this.config.authConfig.username}:${credentials.apiKey}`);
          headers['Authorization'] = `Basic ${auth}`;
          break;
      }
      
      return headers;
    }
  
    protected transformResponse<T>(data: any): T {
      return data as T;
    }
  
    async validateCredentials(credentials: ApiCredentials): Promise<boolean> {
      try {
        // Try to fetch a test quote
        if (this.config.endpoints.quote) {
          const result = await this.getQuote({ symbol: this.config.testSymbol }, credentials);
          return result.success;
        }
        
        // If no quote endpoint, try any available endpoint
        const availableEndpoint = Object.values(this.config.endpoints)[0];
        if (availableEndpoint) {
          const testUrl = this.buildCustomUrl(availableEndpoint, { symbol: this.config.testSymbol });
          const response = await fetch(testUrl, {
            method: availableEndpoint.method,
            headers: this.getAuthHeaders(credentials)
          });
          return response.ok;
        }
        
        return false;
      } catch {
        return false;
      }
    }
  
    async getQuote(request: QuoteRequest, credentials: ApiCredentials): Promise<ApiResponse<StockQuote>> {
      const endpoint = this.config.endpoints.quote;
      if (!endpoint) {
        return {
          success: false,
          error: 'Quote endpoint not configured for this custom API'
        };
      }
  
      try {
        const url = this.buildCustomUrl(endpoint, { symbol: request.symbol });
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...this.getAuthHeaders(credentials),
            ...endpoint.headers
          }
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const rawData = await response.json();
        const mappings = this.config.fieldMappings.quote || [];
        
        // Validate the response structure
        const errors = this.validateResponse(rawData, mappings);
        if (errors.length > 0) {
          throw new ApiError(`Invalid response structure: ${errors[0].message}`, 'INVALID_RESPONSE');
        }
  
        const transformedData = this.transform<StockQuote>(rawData, mappings);
        
        return {
          success: true,
          data: transformedData
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
      const endpoint = this.config.endpoints.historical;
      if (!endpoint) {
        return {
          success: false,
          error: 'Historical data endpoint not configured for this custom API'
        };
      }
  
      try {
        const params = {
          symbol: request.symbol,
          interval: request.interval,
          from: request.from?.toISOString(),
          to: request.to?.toISOString(),
          limit: request.limit?.toString()
        };
  
        const url = this.buildCustomUrl(endpoint, params);
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...this.getAuthHeaders(credentials),
            ...endpoint.headers
          }
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const rawData = await response.json();
        const mappings = this.config.fieldMappings.historical || [];
        
        const errors = this.validateResponse(rawData, mappings);
        if (errors.length > 0) {
          throw new ApiError(`Invalid response structure: ${errors[0].message}`, 'INVALID_RESPONSE');
        }
  
        const transformedData = this.transform<HistoricalDataPoint[]>(rawData, mappings);
        
        return {
          success: true,
          data: transformedData
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
      const endpoint = this.config.endpoints.profile;
      if (!endpoint) {
        return {
          success: false,
          error: 'Company profile endpoint not configured for this custom API'
        };
      }
  
      try {
        const url = this.buildCustomUrl(endpoint, { symbol });
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...this.getAuthHeaders(credentials),
            ...endpoint.headers
          }
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const rawData = await response.json();
        const mappings = this.config.fieldMappings.profile || [];
        
        const errors = this.validateResponse(rawData, mappings);
        if (errors.length > 0) {
          throw new ApiError(`Invalid response structure: ${errors[0].message}`, 'INVALID_RESPONSE');
        }
  
        const transformedData = this.transform<CompanyProfile>(rawData, mappings);
        
        return {
          success: true,
          data: transformedData
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
      const endpoint = this.config.endpoints.news;
      if (!endpoint) {
        return {
          success: false,
          error: 'Market news endpoint not configured for this custom API'
        };
      }
  
      try {
        const params = {
          symbols: request.symbols?.join(','),
          category: request.category,
          limit: request.limit?.toString(),
          from: request.from?.toISOString(),
          to: request.to?.toISOString()
        };
  
        const url = this.buildCustomUrl(endpoint, params);
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...this.getAuthHeaders(credentials),
            ...endpoint.headers
          }
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const rawData = await response.json();
        const mappings = this.config.fieldMappings.news || [];
        
        const errors = this.validateResponse(rawData, mappings);
        if (errors.length > 0) {
          throw new ApiError(`Invalid response structure: ${errors[0].message}`, 'INVALID_RESPONSE');
        }
  
        const transformedData = this.transform<MarketNews[]>(rawData, mappings);
        
        return {
          success: true,
          data: transformedData
        };
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch market news'
        };
      }
    }
  
    async searchSymbols(query: string, credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      const endpoint = this.config.endpoints.search;
      if (!endpoint) {
        return {
          success: false,
          error: 'Symbol search endpoint not configured for this custom API'
        };
      }
  
      try {
        const url = this.buildCustomUrl(endpoint, { query });
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            ...this.getAuthHeaders(credentials),
            ...endpoint.headers
          }
        });
  
        if (!response.ok) {
          throw new ApiError(`HTTP ${response.status}`, 'HTTP_ERROR', response.status);
        }
  
        const rawData = await response.json();
        const mappings = this.config.fieldMappings.search || [];
        
        const transformedData = this.transform<string[]>(rawData, mappings);
        
        return {
          success: true,
          data: transformedData
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to search symbols'
        };
      }
    }
  
    async getSupportedSymbols(_credentials: ApiCredentials): Promise<ApiResponse<string[]>> {
      return {
        success: true,
        data: this.config.supportedSymbols || []
      };
    }
  
    // ResponseTransformer implementation
    transform<T>(rawResponse: any, mappings: ApiFieldMapping[]): T {
      const result: any = {};
      
      for (const mapping of mappings) {
        try {
          let value = this.extractValue(rawResponse, mapping.sourceField);
          
          if (value !== undefined && value !== null) {
            value = this.applyTransform(value, mapping.transform || 'none');
            result[mapping.targetField] = value;
          } else if (mapping.defaultValue !== undefined) {
            result[mapping.targetField] = mapping.defaultValue;
          }
        } catch (error) {
          console.warn(`Failed to map field ${mapping.sourceField}:`, error);
          if (mapping.defaultValue !== undefined) {
            result[mapping.targetField] = mapping.defaultValue;
          }
        }
      }
      
      return result as T;
    }
  
    validateResponse(response: any, mappings: ApiFieldMapping[]): ValidationError[] {
      const errors: ValidationError[] = [];
      
      for (const mapping of mappings.filter(m => m.required)) {
        try {
          const value = this.extractValue(response, mapping.sourceField);
          if (value === undefined || value === null) {
            errors.push({
              field: mapping.sourceField,
              message: `Required field '${mapping.sourceField}' is missing`,
              severity: 'error',
              code: 'MISSING_REQUIRED_FIELD'
            });
          }
        } catch (error) {
          errors.push({
            field: mapping.sourceField,
            message: `Failed to access field '${mapping.sourceField}': ${error}`,
            severity: 'error',
            code: 'FIELD_ACCESS_ERROR'
          });
        }
      }
      
      return errors;
    }
  
    extractValue(obj: any, path: string): any {
      try {
        return path.split('.').reduce((current, key) => {
          // Handle array indices like "data[0]" or "result[0].price"
          const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
          if (arrayMatch) {
            const [, arrayKey, index] = arrayMatch;
            return current[arrayKey]?.[parseInt(index)];
          }
          return current?.[key];
        }, obj);
      } catch {
        return undefined;
      }
    }
  
    applyTransform(value: any, transform: string): any {
      switch (transform) {
        case 'uppercase':
          return typeof value === 'string' ? value.toUpperCase() : value;
        case 'lowercase':
          return typeof value === 'string' ? value.toLowerCase() : value;
        case 'parse_float':
          return parseFloat(value);
        case 'parse_date':
          return new Date(value);
        case 'multiply_100':
          return typeof value === 'number' ? value * 100 : value;
        case 'divide_100':
          return typeof value === 'number' ? value / 100 : value;
        default:
          return value;
      }
    }
  
    private buildCustomUrl(endpoint: CustomApiEndpoint, params: Record<string, any>): string {
      let url = endpoint.url;
      
      // Replace URL parameters like {symbol}
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
      });
      
      // Add query parameters for API key if needed
      const urlObj = new URL(url);
      
      if (this.config.authType === 'api_key' && this.config.authConfig.apiKeyParam) {
        urlObj.searchParams.set(this.config.authConfig.apiKeyParam, params.apiKey || '');
      }
      
      // Add endpoint-specific query params
      if (endpoint.queryParams) {
        Object.entries(endpoint.queryParams).forEach(([key, value]) => {
          urlObj.searchParams.set(key, value);
        });
      }
      
      return urlObj.toString();
    }
  }
  