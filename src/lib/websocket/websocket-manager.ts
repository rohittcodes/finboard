import { StockQuote } from '@/types/api';
import { UserApiConfig } from '@/types/api';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SubscriptionRequest {
  symbols: string[];
  action: 'subscribe' | 'unsubscribe';
  channel?: string;
}

export interface WebSocketMessage {
  type: 'quote' | 'trade' | 'news' | 'error';
  data: any;
  symbol?: string;
  timestamp: number;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // providerId -> symbols
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Connect to a WebSocket endpoint
   */
  async connect(
    providerId: string, 
    config: WebSocketConfig,
    apiConfig: UserApiConfig
  ): Promise<boolean> {
    try {
      if (this.connections.has(providerId)) {
        this.disconnect(providerId);
      }

      const ws = new WebSocket(config.url, config.protocols);
      
      ws.onopen = () => {
        console.log(`WebSocket connected: ${providerId}`);
        this.reconnectAttempts.set(providerId, 0);
        
        // Send authentication if required
        this.authenticateConnection(ws, providerId, apiConfig);
        
        // Re-subscribe to existing symbols
        const symbols = this.subscriptions.get(providerId);
        if (symbols && symbols.size > 0) {
          this.sendSubscriptionMessage(ws, providerId, {
            symbols: Array.from(symbols),
            action: 'subscribe'
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = this.parseMessage(event.data, providerId);
          this.handleMessage(providerId, message);
        } catch (error) {
          console.error(`Failed to parse WebSocket message from ${providerId}:`, error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${providerId}`, event.code, event.reason);
        this.connections.delete(providerId);
        
        if (event.code !== 1000) { // Not a normal closure
          this.attemptReconnect(providerId, config, apiConfig);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error: ${providerId}`, error);
        this.handleMessage(providerId, {
          type: 'error',
          data: { error: 'WebSocket connection error' },
          timestamp: Date.now()
        });
      };

      this.connections.set(providerId, ws);
      return true;
    } catch (error) {
      console.error(`Failed to connect WebSocket for ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from a WebSocket
   */
  disconnect(providerId: string): void {
    const ws = this.connections.get(providerId);
    if (ws) {
      ws.close(1000, 'Client disconnect');
      this.connections.delete(providerId);
    }

    const timer = this.reconnectTimers.get(providerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(providerId);
    }

    this.reconnectAttempts.delete(providerId);
  }

  /**
   * Subscribe to symbols for real-time updates
   */
  subscribe(providerId: string, symbols: string[]): void {
    const existingSymbols = this.subscriptions.get(providerId) || new Set();
    symbols.forEach(symbol => existingSymbols.add(symbol.toUpperCase()));
    this.subscriptions.set(providerId, existingSymbols);

    const ws = this.connections.get(providerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendSubscriptionMessage(ws, providerId, {
        symbols: symbols.map(s => s.toUpperCase()),
        action: 'subscribe'
      });
    }
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(providerId: string, symbols: string[]): void {
    const existingSymbols = this.subscriptions.get(providerId);
    if (existingSymbols) {
      symbols.forEach(symbol => existingSymbols.delete(symbol.toUpperCase()));
      
      const ws = this.connections.get(providerId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(ws, providerId, {
          symbols: symbols.map(s => s.toUpperCase()),
          action: 'unsubscribe'
        });
      }
    }
  }

  /**
   * Add event handler for WebSocket messages
   */
  addHandler(providerId: string, handler: WebSocketEventHandler): void {
    const handlers = this.handlers.get(providerId) || new Set();
    handlers.add(handler);
    this.handlers.set(providerId, handlers);
  }

  /**
   * Remove event handler
   */
  removeHandler(providerId: string, handler: WebSocketEventHandler): void {
    const handlers = this.handlers.get(providerId);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(providerId: string): 'connecting' | 'open' | 'closed' | 'error' {
    const ws = this.connections.get(providerId);
    if (!ws) return 'closed';
    
    switch (ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED: return 'closed';
      default: return 'error';
    }
  }

  /**
   * Get subscribed symbols for a provider
   */
  getSubscriptions(providerId: string): string[] {
    const symbols = this.subscriptions.get(providerId);
    return symbols ? Array.from(symbols) : [];
  }

  private authenticateConnection(ws: WebSocket, providerId: string, apiConfig: UserApiConfig): void {
    // Provider-specific authentication
    switch (providerId) {
      case 'finnhub':
        ws.send(JSON.stringify({
          type: 'auth',
          token: apiConfig.credentials.apiKey
        }));
        break;
      
      case 'alpha-vantage':
        // Alpha Vantage doesn't have WebSocket, but if they did...
        ws.send(JSON.stringify({
          type: 'authenticate',
          apikey: apiConfig.credentials.apiKey
        }));
        break;
        
      default:
        // Generic authentication
        ws.send(JSON.stringify({
          type: 'auth',
          apiKey: apiConfig.credentials.apiKey
        }));
    }
  }

  private sendSubscriptionMessage(ws: WebSocket, providerId: string, request: SubscriptionRequest): void {
    // Provider-specific subscription formats
    switch (providerId) {
      case 'finnhub':
        request.symbols.forEach(symbol => {
          ws.send(JSON.stringify({
            type: request.action,
            symbol: symbol
          }));
        });
        break;
        
      case 'alpha-vantage':
        // Alpha Vantage format (hypothetical)
        ws.send(JSON.stringify({
          function: request.action === 'subscribe' ? 'SUBSCRIBE' : 'UNSUBSCRIBE',
          symbols: request.symbols.join(',')
        }));
        break;
        
      default:
        // Generic format
        ws.send(JSON.stringify({
          action: request.action,
          symbols: request.symbols,
          channel: request.channel || 'quotes'
        }));
    }
  }

  private parseMessage(data: string, providerId: string): WebSocketMessage {
    const rawMessage = JSON.parse(data);
    
    // Provider-specific message parsing
    switch (providerId) {
      case 'finnhub':
        return this.parseFinnhubMessage(rawMessage);
      case 'alpha-vantage':
        return this.parseAlphaVantageMessage(rawMessage);
      default:
        return this.parseGenericMessage(rawMessage);
    }
  }

  private parseFinnhubMessage(message: any): WebSocketMessage {
    if (message.type === 'trade') {
      return {
        type: 'quote',
        symbol: message.data?.[0]?.s,
        data: {
          symbol: message.data?.[0]?.s,
          price: message.data?.[0]?.p,
          timestamp: message.data?.[0]?.t,
          volume: message.data?.[0]?.v
        },
        timestamp: Date.now()
      };
    }
    
    return {
      type: 'error',
      data: message,
      timestamp: Date.now()
    };
  }

  private parseAlphaVantageMessage(message: any): WebSocketMessage {
    // Alpha Vantage WebSocket format (hypothetical)
    return {
      type: 'quote',
      symbol: message.symbol,
      data: {
        symbol: message.symbol,
        price: message.price,
        change: message.change,
        changePercent: message.changePercent,
        timestamp: new Date(message.timestamp)
      },
      timestamp: Date.now()
    };
  }

  private parseGenericMessage(message: any): WebSocketMessage {
    return {
      type: message.type || 'quote',
      symbol: message.symbol,
      data: message.data || message,
      timestamp: Date.now()
    };
  }

  private handleMessage(providerId: string, message: WebSocketMessage): void {
    const handlers = this.handlers.get(providerId);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${providerId}:`, error);
        }
      });
    }
  }

  private attemptReconnect(
    providerId: string, 
    config: WebSocketConfig, 
    apiConfig: UserApiConfig
  ): void {
    const attempts = this.reconnectAttempts.get(providerId) || 0;
    const maxAttempts = config.maxReconnectAttempts || 5;
    
    if (attempts >= maxAttempts) {
      console.error(`Max reconnection attempts reached for ${providerId}`);
      return;
    }

    const interval = config.reconnectInterval || 5000;
    const backoffInterval = interval * Math.pow(2, attempts); // Exponential backoff

    console.log(`Attempting to reconnect ${providerId} in ${backoffInterval}ms (attempt ${attempts + 1}/${maxAttempts})`);

    const timer = setTimeout(() => {
      this.reconnectAttempts.set(providerId, attempts + 1);
      this.connect(providerId, config, apiConfig);
    }, backoffInterval);

    this.reconnectTimers.set(providerId, timer);
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.connections.forEach((ws, providerId) => {
      this.disconnect(providerId);
    });
    this.handlers.clear();
    this.subscriptions.clear();
  }
}

export const wsManager = WebSocketManager.getInstance();
