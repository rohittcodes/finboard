"use client";

import { useRef, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { setupWebSocketHandlers, initializeWebSocketConnections } from "@/store/middleware/websocket-middleware";

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      
      setupWebSocketHandlers(store.dispatch);
      
      const savedConfigs = localStorage.getItem('finboard-api-configs');
      if (savedConfigs) {
        try {
          const configs = JSON.parse(savedConfigs);
          initializeWebSocketConnections(configs.filter((c: any) => c.isActive));
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
