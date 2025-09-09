"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { setupWebSocketHandlers, initializeWebSocketConnections } from "./middleware/websocket-middleware";

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      // Set up WebSocket handlers for RTK Query integration
      setupWebSocketHandlers(store.dispatch);
      
      // Initialize WebSocket connections for configured APIs
      const savedConfigs = localStorage.getItem('finboard-api-configs');
      if (savedConfigs) {
        try {
          const configs = JSON.parse(savedConfigs);
          const activeConfigs = configs.filter((c: any) => c.isActive);
          if (activeConfigs.length > 0) {
            initializeWebSocketConnections(activeConfigs);
          }
        } catch (error) {
          console.error('Failed to initialize WebSocket connections:', error);
        }
      }
    }
  }, []);

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
