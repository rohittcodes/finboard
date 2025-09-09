"use client";

import { useState } from "react";
import { Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGetWatchlistQuotesQuery } from "@/store/api";

interface WatchlistWidgetProps {
  initialSymbols?: string[];
  providerId?: string;
  maxSymbols?: number;
}

export function WatchlistWidget({ 
  initialSymbols = ['AAPL', 'GOOGL', 'MSFT'], 
  providerId,
  maxSymbols = 10 
}: WatchlistWidgetProps) {
  const [symbols, setSymbols] = useState<string[]>(initialSymbols);
  const [newSymbol, setNewSymbol] = useState('');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const {
    data: quotes,
    error,
    isLoading,
    refetch
  } = useGetWatchlistQuotesQuery(
    { symbols, providerId },
    {
      skip: symbols.length === 0,
      pollingInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  const addSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (symbol && !symbols.includes(symbol) && symbols.length < maxSymbols) {
      setSymbols(prev => [...prev, symbol]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbolToRemove: string) => {
    setSymbols(prev => prev.filter(s => s !== symbolToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSymbol();
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Watchlist</CardTitle>
            <CardDescription>Track your favorite stocks in real-time</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {symbols.length}/{maxSymbols}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add symbol (e.g., AAPL)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={symbols.length >= maxSymbols}
          />
          <Button
            onClick={addSymbol}
            disabled={!newSymbol.trim() || symbols.length >= maxSymbols}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && symbols.length > 0 && (
          <div className="text-center py-4 text-muted-foreground">
            Loading watchlist data...
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-red-600">
            Failed to load watchlist data
          </div>
        )}

        {quotes && Object.keys(quotes).length > 0 && (
          <div className="space-y-2">
            {symbols.map((symbol) => {
              const quote = quotes[symbol];
              if (!quote) return null;

              const isPositive = quote.change >= 0;

              return (
                <div
                  key={symbol}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{symbol}</div>
                      {quote.exchange && (
                        <div className="text-xs text-muted-foreground">
                          {quote.exchange}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatPrice(quote.price, quote.currency)}
                      </div>
                      <div className={`text-sm flex items-center gap-1 ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{formatPercent(quote.changePercent)}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSymbol(symbol)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {symbols.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Empty Watchlist</h3>
            <p className="text-muted-foreground mb-4">
              Add stocks to track them in real-time
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-2">
            {isWebSocketConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time updates</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Polling every 30s</span>
              </>
            )}
          </div>
          {quotes && (
            <span>
              {Object.keys(quotes).length} of {symbols.length} loaded
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
