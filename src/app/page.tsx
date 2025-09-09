"use client";

import { useState, useCallback } from "react";
import { ModeToggle } from "@/components/utils/theme-switcher";
import { ApiDashboard } from "@/components/api";
import { StockQuoteWidget } from "@/components/widgets";
import { RealtimeStockWidget } from "@/components/widgets/realtime-stock-widget";
import { WatchlistWidget } from "@/components/widgets/watchlist-widget";
import { Button } from "@/components/ui/button";
import { UserApiConfig } from "@/types/api";
import { apiClient } from "@/lib/api-client";

export default function Home() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'api-config'>('dashboard');
  const [apiConfigs, setApiConfigs] = useState<UserApiConfig[]>([]);

  const handleConfigurationChange = useCallback((configs: UserApiConfig[]) => {
    setApiConfigs(configs);
    apiClient.loadConfigurations(configs);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">FinBoard</h1>
            <nav className="flex gap-4">
              <Button
                variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('dashboard')}
              >
                Home
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/dashboard'}
              >
                Dashboard
              </Button>
              <Button
                variant={currentView === 'api-config' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('api-config')}
              >
                API Settings
              </Button>
            </nav>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="container mx-auto p-6">
        {currentView === 'api-config' ? (
          <ApiDashboard onConfigurationChange={handleConfigurationChange} />
        ) : (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Welcome to FinBoard</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Your comprehensive financial dashboard powered by multiple API providers. 
                Configure your APIs and start tracking stocks, crypto, and market data in real-time.
              </p>
            </div>

            <div className="text-center">
              {apiConfigs.length > 0 ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {apiConfigs.length} API{apiConfigs.length > 1 ? 's' : ''} configured
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">
                    No APIs configured
                  </span>
                </div>
              )}
            </div>

            {apiConfigs.length > 0 ? (
              <div className="space-y-8">
                <WatchlistWidget 
                  initialSymbols={['AAPL', 'GOOGL', 'MSFT', 'TSLA']}
                  providerId={apiConfigs[0]?.providerId}
                  maxSymbols={12}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <RealtimeStockWidget 
                    symbol="AAPL" 
                    providerId={apiConfigs[0]?.providerId}
                  />
                  <RealtimeStockWidget 
                    symbol="GOOGL" 
                    providerId={apiConfigs[0]?.providerId}
                  />
                  <RealtimeStockWidget 
                    symbol="MSFT" 
                    providerId={apiConfigs[0]?.providerId}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Get Started</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Configure your first API provider to start viewing real-time financial data
                </p>
                <Button onClick={() => setCurrentView('api-config')}>
                  Configure APIs
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
