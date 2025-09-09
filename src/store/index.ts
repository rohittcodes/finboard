import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { financeApi } from './api';
import { websocketMiddleware } from './middleware/websocket-middleware';

export const store = configureStore({
  reducer: {
    [financeApi.reducerPath]: financeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: [financeApi.reducerPath + '.queries'],
      },
    })
    .concat(financeApi.middleware)
    .concat(websocketMiddleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
