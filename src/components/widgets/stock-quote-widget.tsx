"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StockQuote } from "@/types/api";
import { apiClient } from "@/lib/api-client";

interface StockQuoteWidgetProps {
  initialSymbol?: string;
  refreshInterval?: number; // in seconds
  autoRefresh?: boolean;
}

export function StockQuoteWidget({ 
  initialSymbol = "AAPL", 
  refreshInterval = 30,
  autoRefresh = false 
}: StockQuoteWidgetProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [inputSymbol, setInputSymbol] = useState(initialSymbol);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuote = async (symbolToFetch: string = symbol) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.getStockQuote(symbolToFetch);
      
      if (result.success && result.data) {
        setQuote(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || "Failed to fetch quote");
        setQuote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSymbolChange = () => {
    if (inputSymbol.trim() && inputSymbol.trim() !== symbol) {
      setSymbol(inputSymbol.trim().toUpperCase());
      fetchQuote(inputSymbol.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSymbolChange();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQuote();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchQuote();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, symbol]);

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Stock Quote</CardTitle>
        <CardDescription>Real-time stock price data</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Symbol Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter symbol (e.g., AAPL)"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSymbolChange}
            disabled={isLoading || !inputSymbol.trim()}
            size="sm"
          >
            Search
          </Button>
        </div>

        {/* Quote Display */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {quote && !isLoading && (
          <div className="space-y-4">
            {/* Main Price Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h3 className="text-2xl font-bold">{quote.symbol}</h3>
                {quote.exchange && (
                  <Badge variant="outline" className="text-xs">
                    {quote.exchange}
                  </Badge>
                )}
              </div>
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

            {/* Additional Data */}
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
              {quote.volume && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Volume:</span>
                  <div className="font-medium">
                    {quote.volume.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground text-center">
              Data as of {quote.timestamp.toLocaleString()}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchQuote()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {autoRefresh && (
          <div className="text-xs text-center text-muted-foreground">
            Auto-refreshing every {refreshInterval}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}

