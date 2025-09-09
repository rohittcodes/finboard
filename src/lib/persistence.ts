import localforage from 'localforage';
import { BaseWidget, WidgetState } from '@/types/widget';
import { UserApiConfig } from '@/types/api';
import { CustomApiConfiguration } from '@/types/custom-api';

if (typeof window !== 'undefined') {
  localforage.config({
    driver: localforage.INDEXEDDB,
    name: 'FinBoard',
    version: 1.0,
    storeName: 'finboard_data',
    description: 'FinBoard dashboard data storage'
  });
}

const STORAGE_KEYS = {
  WIDGETS: 'widgets',
  WIDGET_LAYOUT: 'widget_layout',
  API_CONFIGS: 'api_configs',
  CUSTOM_API_CONFIGS: 'custom_api_configs',
  USER_PREFERENCES: 'user_preferences',
  DASHBOARD_SETTINGS: 'dashboard_settings',
} as const;

export class PersistenceManager {
  private static instance: PersistenceManager;

  private constructor() {}

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }

  async saveWidgets(widgets: Record<string, BaseWidget>): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      await localforage.setItem(STORAGE_KEYS.WIDGETS, widgets);
      console.log('Widgets saved to persistent storage');
    } catch (error) {
      console.error('Failed to save widgets:', error);
      throw error;
    }
  }

  async loadWidgets(): Promise<Record<string, BaseWidget> | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const widgets = await localforage.getItem<Record<string, BaseWidget>>(STORAGE_KEYS.WIDGETS);
      return widgets || null;
    } catch (error) {
      console.error('Failed to load widgets:', error);
      return null;
    }
  }

  async saveWidgetLayout(layout: any[]): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.WIDGET_LAYOUT, layout);
      console.log('Widget layout saved');
    } catch (error) {
      console.error('Failed to save widget layout:', error);
      throw error;
    }
  }

  async loadWidgetLayout(): Promise<any[] | null> {
    try {
      const layout = await localforage.getItem<any[]>(STORAGE_KEYS.WIDGET_LAYOUT);
      return layout || null;
    } catch (error) {
      console.error('Failed to load widget layout:', error);
      return null;
    }
  }

  async saveWidgetState(state: Partial<WidgetState>): Promise<void> {
    try {
      const currentState = await this.loadWidgetState() || {};
      const updatedState = { ...currentState, ...state, lastUpdated: new Date() };
      
      await localforage.setItem('widget_state', updatedState);
      localStorage.setItem('finboard-widget-state', JSON.stringify(updatedState));
      
      console.log('Widget state persisted');
    } catch (error) {
      console.error('Failed to save widget state:', error);
      throw error;
    }
  }

  async loadWidgetState(): Promise<WidgetState | null> {
    try {
      let state = await localforage.getItem<WidgetState>('widget_state');
      
      if (!state) {
        const localStorage_data = localStorage.getItem('finboard-widget-state');
        if (localStorage_data) {
          state = JSON.parse(localStorage_data);
        }
      }
      
      return state || null;
    } catch (error) {
      console.error('Failed to load widget state:', error);
      return null;
    }
  }

  async saveApiConfigs(configs: UserApiConfig[]): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.API_CONFIGS, configs);
      localStorage.setItem('finboard-api-configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save API configs:', error);
      throw error;
    }
  }

  async loadApiConfigs(): Promise<UserApiConfig[]> {
    try {
      const configs = await localforage.getItem<UserApiConfig[]>(STORAGE_KEYS.API_CONFIGS);
      return configs || [];
    } catch (error) {
      console.error('Failed to load API configs:', error);
      return [];
    }
  }

  async saveCustomApiConfigs(configs: CustomApiConfiguration[]): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.CUSTOM_API_CONFIGS, configs);
      localStorage.setItem('finboard-custom-api-configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save custom API configs:', error);
      throw error;
    }
  }

  async loadCustomApiConfigs(): Promise<CustomApiConfiguration[]> {
    try {
      const configs = await localforage.getItem<CustomApiConfiguration[]>(STORAGE_KEYS.CUSTOM_API_CONFIGS);
      return configs || [];
    } catch (error) {
      console.error('Failed to load custom API configs:', error);
      return [];
    }
  }

  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  }

  async loadUserPreferences(): Promise<Record<string, any>> {
    try {
      const preferences = await localforage.getItem<Record<string, any>>(STORAGE_KEYS.USER_PREFERENCES);
      return preferences || {};
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      return {};
    }
  }

  async saveDashboardSettings(settings: {
    theme?: 'light' | 'dark' | 'system';
    autoRefresh?: boolean;
    refreshInterval?: number;
    gridColumns?: number;
    compactMode?: boolean;
  }): Promise<void> {
    try {
      await localforage.setItem(STORAGE_KEYS.DASHBOARD_SETTINGS, settings);
    } catch (error) {
      console.error('Failed to save dashboard settings:', error);
      throw error;
    }
  }

  async loadDashboardSettings(): Promise<any> {
    try {
      const settings = await localforage.getItem(STORAGE_KEYS.DASHBOARD_SETTINGS);
      return settings || {
        theme: 'system',
        autoRefresh: true,
        refreshInterval: 30,
        gridColumns: 12,
        compactMode: false
      };
    } catch (error) {
      console.error('Failed to load dashboard settings:', error);
      return {};
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await localforage.clear();
      localStorage.clear();
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  async getStorageInfo(): Promise<{
    keys: string[];
    totalSize: number;
    itemCount: number;
  }> {
    try {
      const keys = await localforage.keys();
      let totalSize = 0;
      
      for (const key of keys) {
        const item = await localforage.getItem(key);
        totalSize += JSON.stringify(item).length;
      }
      
      return {
        keys,
        totalSize,
        itemCount: keys.length
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { keys: [], totalSize: 0, itemCount: 0 };
    }
  }

  async exportData(): Promise<string> {
    try {
      const data: Record<string, any> = {};
      const keys = await localforage.keys();
      
      for (const key of keys) {
        data[key] = await localforage.getItem(key);
      }
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      for (const [key, value] of Object.entries(data)) {
        await localforage.setItem(key, value);
      }
      
      console.log('Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
}

export const persistence = PersistenceManager.getInstance();

export const saveWidgets = (widgets: Record<string, BaseWidget>) => 
  persistence.saveWidgets(widgets);

export const loadWidgets = () => 
  persistence.loadWidgets();

export const saveWidgetLayout = (layout: any[]) => 
  persistence.saveWidgetLayout(layout);

export const loadWidgetLayout = () => 
  persistence.loadWidgetLayout();

export const saveWidgetState = (state: Partial<WidgetState>) => 
  persistence.saveWidgetState(state);

export const loadWidgetState = () => 
  persistence.loadWidgetState();
