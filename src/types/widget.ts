export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type WidgetType = 
  | 'stock-quote'
  | 'watchlist' 
  | 'price-chart'
  | 'news-feed'
  | 'market-overview'
  | 'portfolio-summary'
  | 'economic-calendar'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
}

export interface WidgetSize {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetConfig {
  // Common config
  title?: string;
  refreshInterval?: number; // seconds
  providerId?: string;
  
  // Stock Quote Widget
  symbol?: string;
  showExtendedHours?: boolean;
  showVolume?: boolean;
  
  // Watchlist Widget  
  symbols?: string[];
  maxSymbols?: number;
  showChangePercent?: boolean;
  
  // Chart Widget
  chartType?: 'line' | 'candlestick' | 'area';
  timeframe?: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  indicators?: string[];
  
  // News Widget
  categories?: string[];
  maxArticles?: number;
  
  // Market Overview
  indices?: string[];
  sectors?: string[];
  
  // Portfolio Widget
  holdings?: PortfolioHolding[];
  baseCurrency?: string;
  
  // Custom Widget
  customEndpoint?: string;
  customFields?: Record<string, any>;
}

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  value?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

// Widget state management
export interface WidgetState {
  items: Record<string, BaseWidget>;
  layout: WidgetPosition[];
  selectedWidget: string | null;
  isEditing: boolean;
  lastUpdated: Date | null;
}

// Widget creation/update payloads
export interface CreateWidgetPayload {
  type: WidgetType;
  title?: string;
  position?: Partial<WidgetPosition>;
  config?: Partial<WidgetConfig>;
}

export interface UpdateWidgetPayload {
  id: string;
  updates: Partial<Omit<BaseWidget, 'id' | 'createdAt'>>;
}

export interface MoveWidgetPayload {
  id: string;
  position: WidgetPosition;
}

// Widget templates for quick creation
export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  type: WidgetType;
  defaultConfig: WidgetConfig;
  defaultSize: WidgetPosition;
  icon: string;
  category: 'stocks' | 'crypto' | 'forex' | 'news' | 'portfolio' | 'custom';
}

// Pre-defined widget templates
export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'stock-quote-template',
    name: 'Stock Quote',
    description: 'Real-time stock price with change indicators',
    type: 'stock-quote',
    defaultConfig: {
      symbol: 'AAPL',
      showExtendedHours: false,
      showVolume: true,
      refreshInterval: 30
    },
    defaultSize: { x: 0, y: 0, w: 4, h: 3 },
    icon: 'TrendingUp',
    category: 'stocks'
  },
  {
    id: 'watchlist-template',
    name: 'Watchlist',
    description: 'Track multiple stocks in one widget',
    type: 'watchlist',
    defaultConfig: {
      symbols: ['AAPL', 'GOOGL', 'MSFT'],
      maxSymbols: 10,
      showChangePercent: true,
      refreshInterval: 30
    },
    defaultSize: { x: 0, y: 0, w: 6, h: 4 },
    icon: 'List',
    category: 'stocks'
  },
  {
    id: 'price-chart-template',
    name: 'Price Chart',
    description: 'Interactive candlestick or line chart',
    type: 'price-chart',
    defaultConfig: {
      symbol: 'AAPL',
      chartType: 'candlestick',
      timeframe: '1D',
      indicators: ['SMA20', 'SMA50'],
      refreshInterval: 60
    },
    defaultSize: { x: 0, y: 0, w: 8, h: 5 },
    icon: 'BarChart3',
    category: 'stocks'
  },
  {
    id: 'news-feed-template',
    name: 'News Feed',
    description: 'Latest market news and updates',
    type: 'news-feed',
    defaultConfig: {
      categories: ['general', 'forex'],
      maxArticles: 10,
      refreshInterval: 300
    },
    defaultSize: { x: 0, y: 0, w: 6, h: 6 },
    icon: 'Newspaper',
    category: 'news'
  },
  {
    id: 'market-overview-template',
    name: 'Market Overview',
    description: 'Major indices and market summary',
    type: 'market-overview',
    defaultConfig: {
      indices: ['SPY', 'QQQ', 'DIA'],
      sectors: ['Technology', 'Healthcare', 'Finance'],
      refreshInterval: 60
    },
    defaultSize: { x: 0, y: 0, w: 8, h: 4 },
    icon: 'Globe',
    category: 'stocks'
  }
];
