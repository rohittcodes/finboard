// API Structure Detection and Auto-Mapping System

import { 
  DetectedApiStructure, 
  DetectedField, 
  ApiFieldMapping, 
  CustomApiValidationResult,
  ValidationError,
  ValidationWarning 
} from '@/types/custom-api';
import { StockQuote, CompanyProfile, MarketNews } from '@/types/api';

export class ApiStructureDetector {
  private static readonly FIELD_PATTERNS = {
    // Stock Quote patterns
    symbol: ['symbol', 'ticker', 'code', 'stock_code', 'instrument'],
    price: ['price', 'last', 'last_price', 'current_price', 'close', 'ltp', 'lastPrice'],
    change: ['change', 'net_change', 'price_change', 'daily_change'],
    changePercent: ['change_percent', 'percent_change', 'pct_change', 'change_pct', 'percentage'],
    volume: ['volume', 'vol', 'total_volume', 'traded_volume'],
    high: ['high', 'day_high', 'daily_high', 'h'],
    low: ['low', 'day_low', 'daily_low', 'l'],
    open: ['open', 'open_price', 'opening_price', 'o'],
    previousClose: ['prev_close', 'previous_close', 'yesterday_close', 'pc'],
    
    // Company Profile patterns
    name: ['name', 'company_name', 'full_name', 'companyName'],
    description: ['description', 'about', 'business_description', 'summary'],
    sector: ['sector', 'industry_sector', 'gics_sector'],
    industry: ['industry', 'sub_industry', 'gics_industry'],
    marketCap: ['market_cap', 'market_capitalization', 'mcap', 'marketCapitalization'],
    employees: ['employees', 'employee_count', 'total_employees', 'workforce'],
    website: ['website', 'web_url', 'homepage', 'url'],
    
    // News patterns
    title: ['title', 'headline', 'subject', 'header'],
    summary: ['summary', 'description', 'excerpt', 'snippet'],
    publishedAt: ['published_at', 'date', 'timestamp', 'created_at', 'pub_date'],
    source: ['source', 'publisher', 'author', 'provider'],
    url: ['url', 'link', 'href', 'article_url'],
    
    // Historical data patterns
    timestamp: ['timestamp', 'date', 'time', 'datetime', 't'],
    close: ['close', 'closing_price', 'c'],
    // open, high, low already defined above
  };

  private static readonly VALUE_PATTERNS = {
    // Detect field types by value patterns
    symbol: /^[A-Z]{1,8}$/,
    price: /^\d+\.?\d*$/,
    percentage: /^-?\d+\.?\d*%?$/,
    date: /^\d{4}-\d{2}-\d{2}|^\d{10,13}$|^\d{4}\/\d{2}\/\d{2}/,
    url: /^https?:\/\//,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };

  /**
   * Detect API structure from a sample response
   */
  static async detectStructure(
    endpoint: string,
    sampleResponse: any,
    expectedType: 'quote' | 'historical' | 'profile' | 'news' | 'search'
  ): Promise<DetectedApiStructure> {
    const detectedFields = this.extractFields(sampleResponse);
    const suggestedMappings = this.generateMappings(detectedFields, expectedType);
    const confidence = this.calculateConfidence(suggestedMappings);

    return {
      endpoint,
      sampleResponse,
      detectedFields,
      suggestedMappings,
      confidence
    };
  }

  /**
   * Extract all fields from the response with their paths and types
   */
  private static extractFields(obj: any, path: string = ''): DetectedField[] {
    const fields: DetectedField[] = [];

    const traverse = (current: any, currentPath: string) => {
      if (current === null || current === undefined) return;

      if (Array.isArray(current)) {
        // Handle arrays - analyze first few elements
        current.slice(0, 3).forEach((item, index) => {
          if (typeof item === 'object') {
            traverse(item, `${currentPath}[${index}]`);
          } else {
            fields.push({
              path: `${currentPath}[${index}]`,
              value: item,
              type: this.getValueType(item),
              possibleMappings: this.findPossibleMappings(currentPath, item)
            });
          }
        });
      } else if (typeof current === 'object') {
        // Handle objects
        Object.entries(current).forEach(([key, value]) => {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          
          if (typeof value === 'object' && value !== null) {
            traverse(value, newPath);
          } else {
            fields.push({
              path: newPath,
              value,
              type: this.getValueType(value),
              possibleMappings: this.findPossibleMappings(key, value)
            });
          }
        });
      }
    };

    traverse(obj, path);
    return fields;
  }

  /**
   * Determine the type of a value
   */
  private static getValueType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Try to detect if it's a date
      if (this.VALUE_PATTERNS.date.test(value) || !isNaN(Date.parse(value))) {
        return 'date';
      }
      return 'string';
    }
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  /**
   * Find possible mappings for a field based on its name and value
   */
  private static findPossibleMappings(fieldName: string, value: any): Array<{
    targetField: string;
    confidence: number;
    reason: string;
  }> {
    const mappings: Array<{ targetField: string; confidence: number; reason: string; }> = [];
    const lowerFieldName = fieldName.toLowerCase();

    // Check field name patterns
    Object.entries(this.FIELD_PATTERNS).forEach(([targetField, patterns]) => {
      patterns.forEach(pattern => {
        if (lowerFieldName.includes(pattern.toLowerCase())) {
          const confidence = lowerFieldName === pattern.toLowerCase() ? 0.9 : 0.7;
          mappings.push({
            targetField,
            confidence,
            reason: `Field name '${fieldName}' matches pattern '${pattern}'`
          });
        }
      });
    });

    // Check value patterns
    if (typeof value === 'string') {
      if (this.VALUE_PATTERNS.symbol.test(value)) {
        mappings.push({
          targetField: 'symbol',
          confidence: 0.8,
          reason: `Value '${value}' matches stock symbol pattern`
        });
      }
      if (this.VALUE_PATTERNS.url.test(value)) {
        mappings.push({
          targetField: 'url',
          confidence: 0.9,
          reason: `Value '${value}' is a URL`
        });
      }
    }

    if (typeof value === 'number') {
      // Price-like numbers (usually positive, with decimals)
      if (value > 0 && value < 10000 && value.toString().includes('.')) {
        mappings.push({
          targetField: 'price',
          confidence: 0.6,
          reason: `Numeric value ${value} could be a price`
        });
      }
      
      // Volume-like numbers (usually large integers)
      if (value > 1000 && Number.isInteger(value)) {
        mappings.push({
          targetField: 'volume',
          confidence: 0.5,
          reason: `Large integer ${value} could be volume`
        });
      }
    }

    // Sort by confidence
    return mappings
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Keep top 3 matches
  }

  /**
   * Generate suggested field mappings based on detected fields
   */
  private static generateMappings(
    detectedFields: DetectedField[],
    expectedType: 'quote' | 'historical' | 'profile' | 'news' | 'search'
  ): ApiFieldMapping[] {
    const mappings: ApiFieldMapping[] = [];
    const usedFields = new Set<string>();

    // Get required fields for the expected type
    const requiredFields = this.getRequiredFields(expectedType);

    // For each required field, find the best match
    requiredFields.forEach(targetField => {
      const bestMatch = detectedFields
        .filter(field => !usedFields.has(field.path))
        .flatMap(field => 
          field.possibleMappings
            .filter(mapping => mapping.targetField === targetField)
            .map(mapping => ({ ...mapping, field }))
        )
        .sort((a, b) => b.confidence - a.confidence)[0];

      if (bestMatch && bestMatch.confidence > 0.5) {
        mappings.push({
          sourceField: bestMatch.field.path,
          targetField: targetField as any,
          dataType: bestMatch.field.type === 'object' ? 'string' : bestMatch.field.type,
          transform: this.suggestTransform(bestMatch.field.value, bestMatch.field.type),
          required: this.isFieldRequired(targetField, expectedType)
        });
        usedFields.add(bestMatch.field.path);
      }
    });

    return mappings;
  }

  /**
   * Get required fields for each API type
   */
  private static getRequiredFields(type: 'quote' | 'historical' | 'profile' | 'news' | 'search'): string[] {
    switch (type) {
      case 'quote':
        return ['symbol', 'price', 'timestamp'];
      case 'historical':
        return ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
      case 'profile':
        return ['symbol', 'name'];
      case 'news':
        return ['title', 'publishedAt', 'source'];
      case 'search':
        return ['symbol'];
      default:
        return [];
    }
  }

  /**
   * Check if a field is required for the API type
   */
  private static isFieldRequired(field: string, type: 'quote' | 'historical' | 'profile' | 'news' | 'search'): boolean {
    const requiredFields = this.getRequiredFields(type);
    return requiredFields.includes(field);
  }

  /**
   * Suggest data transformation based on value and type
   */
  private static suggestTransform(value: any, type: string): ApiFieldMapping['transform'] {
    if (type === 'string' && typeof value === 'string') {
      if (value === value.toLowerCase() && this.FIELD_PATTERNS.symbol.some(pattern => 
        pattern.toLowerCase().includes(value.toLowerCase())
      )) {
        return 'uppercase';
      }
    }
    
    if (type === 'number' && typeof value === 'string' && !isNaN(parseFloat(value))) {
      return 'parse_float';
    }
    
    if (type === 'date' && typeof value === 'string') {
      return 'parse_date';
    }
    
    // Check if it's a percentage that needs conversion
    if (typeof value === 'number' && Math.abs(value) < 1 && value !== 0) {
      return 'multiply_100'; // Convert 0.05 to 5%
    }
    
    return 'none';
  }

  /**
   * Calculate confidence score for the detection
   */
  private static calculateConfidence(mappings: ApiFieldMapping[]): 'high' | 'medium' | 'low' {
    if (mappings.length === 0) return 'low';
    
    const averageConfidence = mappings.reduce((sum, mapping) => {
      // Estimate confidence based on mapping completeness
      return sum + (mapping.required ? 1 : 0.5);
    }, 0) / mappings.length;
    
    if (averageConfidence > 0.8) return 'high';
    if (averageConfidence > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Validate a custom API configuration
   */
  static async validateCustomApi(
    baseUrl: string,
    endpoint: string,
    authHeaders: Record<string, string>,
    testSymbol: string = 'AAPL'
  ): Promise<CustomApiValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Test the API endpoint
      const testUrl = endpoint.replace('{symbol}', testSymbol);
      const response = await fetch(testUrl, { 
        headers: authHeaders,
        method: 'GET'
      });

      if (!response.ok) {
        errors.push({
          field: 'endpoint',
          message: `API returned ${response.status}: ${response.statusText}`,
          severity: 'error',
          code: 'HTTP_ERROR'
        });
        
        return { isValid: false, errors, warnings };
      }

      const data = await response.json();
      
      // Detect structure
      const structure = await this.detectStructure(endpoint, data, 'quote');
      
      // Validate that we can map essential fields
      const essentialFields = ['symbol', 'price'];
      const mappedEssential = structure.suggestedMappings.filter(mapping => 
        essentialFields.includes(mapping.targetField as string)
      );

      if (mappedEssential.length < essentialFields.length) {
        warnings.push({
          field: 'mappings',
          message: 'Could not automatically detect all essential fields',
          suggestion: 'You may need to manually configure field mappings'
        });
      }

      return {
        isValid: true,
        errors,
        warnings,
        detectedStructure: structure,
        suggestedImprovements: this.generateImprovementSuggestions(structure)
      };

    } catch (error) {
      errors.push({
        field: 'connection',
        message: `Failed to connect to API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: 'CONNECTION_ERROR'
      });

      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Generate suggestions for improving the API configuration
   */
  private static generateImprovementSuggestions(structure: DetectedApiStructure): string[] {
    const suggestions: string[] = [];

    if (structure.confidence === 'low') {
      suggestions.push('Consider providing more sample data or checking if the API endpoint is correct');
    }

    if (structure.suggestedMappings.length < 3) {
      suggestions.push('This API may have limited data fields. Consider using it alongside other providers');
    }

    const hasTimestamp = structure.suggestedMappings.some(m => m.targetField === 'timestamp');
    if (!hasTimestamp) {
      suggestions.push('No timestamp field detected. Real-time data may not be available');
    }

    return suggestions;
  }
}
