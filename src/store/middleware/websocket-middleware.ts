import { Middleware } from '@reduxjs/toolkit';
import { financeApi } from '../api';
import { wsManager, WebSocketMessage } from '@/lib/websocket/websocket-manager';

// WebSocket middleware that integrates with RTK Query
export const websocketMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Handle RTK Query actions
  if (financeApi.endpoints.getStockQuote.matchFulfilled(action)) {
    // When a quote is successfully fetched, start real-time updates if available
    const { symbol } = action.meta.arg.originalArgs;
    const providerId = action.meta.arg.originalArgs.providerId;
    
    if (providerId && wsManager.getConnectionStatus(providerId) === 'open') {
      wsManager.subscribe(providerId, [symbol]);
    }
  }

  if (financeApi.endpoints.getWatchlistQuotes.matchFulfilled(action)) {
    // Subscribe to all watchlist symbols
    const { symbols, providerId } = action.meta.arg.originalArgs;
    
    if (providerId && wsManager.getConnectionStatus(providerId) === 'open') {
      wsManager.subscribe(providerId, symbols);
    }
  }

  return result;
};

// WebSocket event handlers for updating RTK Query cache
export const setupWebSocketHandlers = (dispatch: any) => {
  const handleWebSocketMessage = (providerId: string) => (message: WebSocketMessage) => {
    switch (message.type) {
      case 'quote':
        if (message.symbol && message.data) {
          // Update the cache with real-time quote data
          dispatch(
            financeApi.util.updateQueryData('getStockQuote', 
              { symbol: message.symbol, providerId }, 
              (draft) => {
                Object.assign(draft, {
                  ...message.data,
                  timestamp: new Date(message.timestamp)
                });
              }
            )
          );

          // Also update watchlist cache if it exists
          if (message.symbol) {
            dispatch(
              financeApi.util.updateQueryData('getWatchlistQuotes',
                { symbols: [message.symbol], providerId },
                (draft) => {
                  const symbol = message.symbol!;
                  if (draft[symbol]) {
                    Object.assign(draft[symbol], {
                      ...message.data,
                      timestamp: new Date(message.timestamp)
                    });
                  }
                }
              )
            );
          }
        }
        break;

      case 'error':
        console.error(`WebSocket error from ${providerId}:`, message.data);
        break;
    }
  };

  // Set up handlers only for providers that actually support WebSocket
  ['finnhub'].forEach(providerId => {
    wsManager.addHandler(providerId, handleWebSocketMessage(providerId));
  });
};

// Utility to start WebSocket connections for configured providers
export const initializeWebSocketConnections = async (apiConfigs: any[]) => {
  const webSocketConfigs: Record<string, any> = {
    finnhub: {
      url: 'wss://ws.finnhub.io',
      reconnectInterval: 5000,
      maxReconnectAttempts: 5
    }
  };

  for (const apiConfig of apiConfigs) {
    const wsConfig = webSocketConfigs[apiConfig.providerId];
    if (wsConfig) {
      try {
        await wsManager.connect(apiConfig.providerId, wsConfig, apiConfig);
        console.log(`WebSocket connected for ${apiConfig.providerId}`);
      } catch (error) {
        console.error(`Failed to connect WebSocket for ${apiConfig.providerId}:`, error);
      }
    } else {
      console.log(`WebSocket not available for ${apiConfig.providerId} - using polling mode`);
    }
  }
};
