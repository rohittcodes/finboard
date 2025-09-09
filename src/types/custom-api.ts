export interface CustomApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: string;
  description?: string;
}

export interface ApiFieldMapping {
  // Our standard field name -> API response field path
  sourceField: string; // e.g., "data.price" or "result[0].last_price"
  targetField: keyof StockQuote | keyof CompanyProfile | keyof MarketNews; // Our standard fields
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  transform?: 'none' | 'uppercase' | 'lowercase' | 'parse_float' | 'parse_date' | 'multiply_100' | 'divide_100';
  defaultValue?: any;
  required?: boolean;
}

export interface CustomApiConfiguration {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: 'none' | 'api_key' | 'bearer_token' | 'basic_auth' | 'custom_header';
  authConfig: {
    apiKeyParam?: string; // Query param name for API key
    headerName?: string; // Header name for auth
    headerPrefix?: string; // e.g., "Bearer ", "API-Key "
    username?: string; // For basic auth
  };
  
  // Available endpoints
  endpoints: {
    quote?: CustomApiEndpoint;
    historical?: CustomApiEndpoint;
    profile?: CustomApiEndpoint;
    news?: CustomApiEndpoint;
    search?: CustomApiEndpoint;
  };
  
  // Field mappings for each endpoint
  fieldMappings: {
    quote?: ApiFieldMapping[];
    historical?: ApiFieldMapping[];
    profile?: ApiFieldMapping[];
    news?: ApiFieldMapping[];
    search?: ApiFieldMapping[];
  };
  
  // API characteristics
  rateLimitPerMinute: number;
  supportedSymbols?: string[]; // If known
  testSymbol: string; // Symbol to use for testing
  
  // Validation status
  validated: boolean;
  lastValidated?: Date;
  validationErrors?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

// API response structure detection
export interface DetectedApiStructure {
  endpoint: string;
  sampleResponse: any;
  detectedFields: DetectedField[];
  suggestedMappings: ApiFieldMapping[];
  confidence: 'high' | 'medium' | 'low';
}

export interface DetectedField {
  path: string; // e.g., "data.price", "result[0].symbol"
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  possibleMappings: Array<{
    targetField: string;
    confidence: number; // 0-1
    reason: string;
  }>;
}

import { StockQuote, CompanyProfile, MarketNews } from './api';

// Template configurations for common API patterns
export interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  pattern: 'rest_json' | 'rest_xml' | 'graphql' | 'websocket';
  commonEndpoints: CustomApiEndpoint[];
  commonMappings: ApiFieldMapping[];
  authTypes: Array<'none' | 'api_key' | 'bearer_token' | 'basic_auth'>;
  examples: {
    baseUrl: string;
    sampleResponse: any;
  }[];
}

// Validation result for custom APIs
export interface CustomApiValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  detectedStructure?: DetectedApiStructure;
  suggestedImprovements?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Runtime API response transformation
export interface ResponseTransformer {
  transform<T>(rawResponse: any, mappings: ApiFieldMapping[]): T;
  validateResponse(response: any, mappings: ApiFieldMapping[]): ValidationError[];
  extractValue(obj: any, path: string): any;
  applyTransform(value: any, transform: string): any;
}
