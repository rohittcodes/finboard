import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { financeApi } from './api';
import { widgetSlice } from './slices/widgetSlice';

export const store = configureStore({
  reducer: {
    [financeApi.reducerPath]: financeApi.reducer,
    widgets: widgetSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionsPaths: ['payload.timestamp', 'payload.createdAt', 'payload.updatedAt'],
        ignoredPaths: [
          'widgets.items',
          'widgets.lastUpdated',
          'widgets.items.*.createdAt',
          'widgets.items.*.updatedAt'
        ],
      },
    })
    .concat(financeApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
