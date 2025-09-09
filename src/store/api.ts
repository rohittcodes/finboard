// RTK Query API Setup for Financial Data

import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { StockQuote, HistoricalDataPoint, CompanyProfile, MarketNews, ApiResponse } from '@/types/api';
import { apiClient } from '@/lib/api-client';

// Custom base query that uses our API client
const apiClientBaseQuery: BaseQueryFn<
  {
    method: 'getQuote' | 'getHistoricalData' | 'getCompanyProfile' | 'getMarketNews' | 'searchSymbols';
    args: any;
    providerId?: string;
  },
  unknown,
  { error: string; status?: number }
> = async ({ method, args, providerId }) => {
  try {
    let result: ApiResponse<any>;
    
    switch (method) {
      case 'getQuote':
        result = await apiClient.getStockQuote(args.symbol, providerId);
        break;
      case 'getHistoricalData':
        result = await apiClient.getHistoricalData(args.symbol, args.interval, args);
        break;
      case 'getCompanyProfile':
        result = await apiClient.getCompanyProfile(args.symbol, providerId);
        break;
      case 'getMarketNews':
        result = await apiClient.getMarketNews(args);
        break;
      case 'searchSymbols':
        result = await apiClient.searchSymbols(args.query, providerId);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    if (result.success) {
      return { data: result.data };
    } else {
      return { error: { error: result.error || 'API request failed' } };
    }
  } catch (error) {
    return {
      error: {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
};

export const financeApi = createApi({
  reducerPath: 'financeApi',
  baseQuery: apiClientBaseQuery,
  tagTypes: ['Quote', 'Historical', 'Profile', 'News', 'Search'],
  endpoints: (builder) => ({
    // Stock Quote
    getStockQuote: builder.query<StockQuote, { symbol: string; providerId?: string }>({
      query: ({ symbol, providerId }) => ({
        method: 'getQuote',
        args: { symbol },
        providerId
      }),
      providesTags: (result, error, { symbol }) => [{ type: 'Quote', id: symbol }],
      // Cache for 30 seconds
      keepUnusedDataFor: 30,
    }),

    // Historical Data
    getHistoricalData: builder.query<
      HistoricalDataPoint[], 
      { 
        symbol: string; 
        interval: string; 
        from?: Date; 
        to?: Date; 
        limit?: number;
        providerId?: string;
      }
    >({
      query: ({ symbol, interval, from, to, limit, providerId }) => ({
        method: 'getHistoricalData',
        args: { symbol, interval, from, to, limit },
        providerId
      }),
      providesTags: (result, error, { symbol, interval }) => [
        { type: 'Historical', id: `${symbol}-${interval}` }
      ],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    // Company Profile
    getCompanyProfile: builder.query<CompanyProfile, { symbol: string; providerId?: string }>({
      query: ({ symbol, providerId }) => ({
        method: 'getCompanyProfile',
        args: { symbol },
        providerId
      }),
      providesTags: (result, error, { symbol }) => [{ type: 'Profile', id: symbol }],
      // Cache for 1 hour (company info doesn't change often)
      keepUnusedDataFor: 3600,
    }),

    // Market News
    getMarketNews: builder.query<
      MarketNews[], 
      { 
        symbols?: string[]; 
        category?: string; 
        limit?: number;
        from?: Date;
        to?: Date;
        providerId?: string;
      }
    >({
      query: ({ symbols, category, limit, from, to, providerId }) => ({
        method: 'getMarketNews',
        args: { symbols, category, limit, from, to },
        providerId
      }),
      providesTags: ['News'],
      // Cache for 10 minutes
      keepUnusedDataFor: 600,
    }),

    // Symbol Search
    searchSymbols: builder.query<string[], { query: string; providerId?: string }>({
      query: ({ query, providerId }) => ({
        method: 'searchSymbols',
        args: { query },
        providerId
      }),
      providesTags: ['Search'],
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
    }),

    // Multiple Quotes (parallel fetching)
    getMultipleQuotes: builder.query<
      Record<string, StockQuote>, 
      { symbols: string[]; providerId?: string }
    >({
      queryFn: async ({ symbols, providerId }) => {
        try {
          const quotes = await apiClient.getMultipleQuotes(symbols, providerId);
          const result: Record<string, StockQuote> = {};
          
          quotes.forEach((response, symbol) => {
            if (response.success && response.data) {
              result[symbol] = response.data;
            }
          });
          
          return { data: result };
        } catch (error) {
          return {
            error: {
              error: error instanceof Error ? error.message : 'Failed to fetch multiple quotes'
            }
          };
        }
      },
      providesTags: (result, error, { symbols }) =>
        symbols.map(symbol => ({ type: 'Quote' as const, id: symbol })),
      keepUnusedDataFor: 30,
    }),

    // Watchlist Quotes (for dashboard)
    getWatchlistQuotes: builder.query<
      Record<string, StockQuote>,
      { symbols: string[]; providerId?: string }
    >({
      queryFn: async ({ symbols, providerId }) => {
        try {
          const quotes = await apiClient.getMultipleQuotes(symbols, providerId);
          const result: Record<string, StockQuote> = {};
          
          quotes.forEach((response, symbol) => {
            if (response.success && response.data) {
              result[symbol] = response.data;
            }
          });
          
          return { data: result };
        } catch (error) {
          return {
            error: {
              error: error instanceof Error ? error.message : 'Failed to fetch watchlist quotes'
            }
          };
        }
      },
      providesTags: ['Quote'],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetStockQuoteQuery,
  useGetHistoricalDataQuery,
  useGetCompanyProfileQuery,
  useGetMarketNewsQuery,
  useSearchSymbolsQuery,
  useGetMultipleQuotesQuery,
  useGetWatchlistQuotesQuery,
  useLazyGetStockQuoteQuery,
  useLazySearchSymbolsQuery,
} = financeApi;
