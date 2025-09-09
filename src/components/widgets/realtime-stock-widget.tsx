"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetStockQuoteQuery } from "@/store/api";
import { wsManager } from "@/lib/websocket/websocket-manager";

interface RealtimeStockWidgetProps {
  symbol: string;
  providerId?: string;
  showWebSocketStatus?: boolean;
}

export function RealtimeStockWidget({ 
  symbol, 
  providerId,
  showWebSocketStatus = true 
}: RealtimeStockWidgetProps) {
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // RTK Query for initial data and caching
  const {
    data: quote,
    error,
    isLoading,
    refetch
  } = useGetStockQuoteQuery(
    { symbol, providerId },
    {
      // Poll every 30 seconds as fallback
      pollingInterval: 30000,
      // Skip if we have WebSocket connection
      skip: false
    }
  );

  // Monitor WebSocket connection status
  useEffect(() => {
    if (!providerId) return;

    const checkConnection = () => {
      const status = wsManager.getConnectionStatus(providerId);
      setIsWebSocketConnected(status === 'open');
    };

    // Check initial status
    checkConnection();

    // Set up periodic status check
    const interval = setInterval(checkConnection, 5000);

    // Subscribe to real-time updates
    wsManager.subscribe(providerId, [symbol]);

    // Set up WebSocket message handler
    const handleMessage = (message: any) => {
      if (message.symbol === symbol && message.type === 'quote') {
        setLastUpdate(new Date());
      }
    };

    wsManager.addHandler(providerId, handleMessage);

    return () => {
      clearInterval(interval);
      wsManager.unsubscribe(providerId, [symbol]);
      wsManager.removeHandler(providerId, handleMessage);
    };
  }, [symbol, providerId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const isPositiveChange = quote && quote.change >= 0;

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️ Error</div>
            <div className="text-sm text-muted-foreground">
              Failed to load data for {symbol}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <CardDescription>Real-time Quote</CardDescription>
          </div>
          {showWebSocketStatus && (
            <div className="flex items-center gap-2">
              {isWebSocketConnected ? (
                <Badge variant="default" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Polling
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && !quote ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        ) : quote ? (
          <>
            {/* Main Price Display */}
            <div className="text-center">
              <div className="text-3xl font-bold">
                {formatPrice(quote.price)}
              </div>
              <div className={`flex items-center justify-center gap-1 text-lg ${
                isPositiveChange ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{formatPrice(Math.abs(quote.change))}</span>
                <span>({formatPercent(quote.changePercent)})</span>
              </div>
            </div>

            {/* Additional Data Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {quote.open && (
                <div>
                  <span className="text-muted-foreground">Open:</span>
                  <div className="font-medium">{formatPrice(quote.open)}</div>
                </div>
              )}
              {quote.high && (
                <div>
                  <span className="text-muted-foreground">High:</span>
                  <div className="font-medium">{formatPrice(quote.high)}</div>
                </div>
              )}
              {quote.low && (
                <div>
                  <span className="text-muted-foreground">Low:</span>
                  <div className="font-medium">{formatPrice(quote.low)}</div>
                </div>
              )}
              {quote.previousClose && (
                <div>
                  <span className="text-muted-foreground">Prev Close:</span>
                  <div className="font-medium">{formatPrice(quote.previousClose)}</div>
                </div>
              )}
            </div>

            {quote.volume && (
              <div className="text-sm">
                <span className="text-muted-foreground">Volume:</span>
                <span className="ml-2 font-medium">
                  {quote.volume.toLocaleString()}
                </span>
              </div>
            )}

            {/* Status and Timestamps */}
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div>
                {isWebSocketConnected ? 'Real-time' : 'Polling mode'}
              </div>
              <div>
                {lastUpdate ? (
                  `Updated ${lastUpdate.toLocaleTimeString()}`
                ) : (
                  `Data: ${quote.timestamp.toLocaleTimeString()}`
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
