// Widget State Management with Redux Toolkit

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  BaseWidget, 
  WidgetState, 
  CreateWidgetPayload, 
  UpdateWidgetPayload, 
  MoveWidgetPayload,
  WidgetPosition,
  WIDGET_TEMPLATES
} from '@/types/widget';

const initialState: WidgetState = {
  items: {},
  layout: [],
  selectedWidget: null,
  isEditing: false,
  lastUpdated: null,
};

export const widgetSlice = createSlice({
  name: 'widgets',
  initialState,
  reducers: {
    // Add a new widget
    addWidget: (state, action: PayloadAction<CreateWidgetPayload>) => {
      const { type, title, position, config } = action.payload;
      const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Find template for default values
      const template = WIDGET_TEMPLATES.find(t => t.type === type);
      
      const widget: BaseWidget = {
        id,
        type,
        title: title || template?.name || `${type} Widget`,
        position: {
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          w: position?.w ?? template?.defaultSize.w ?? 4,
          h: position?.h ?? template?.defaultSize.h ?? 3,
        },
        size: {
          minW: 2,
          minH: 2,
          maxW: 12,
          maxH: 8,
        },
        config: {
          ...template?.defaultConfig,
          ...config,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      state.items[id] = widget;
      state.layout.push(widget.position);
      state.lastUpdated = new Date();
    },

    // Update existing widget
    updateWidget: (state, action: PayloadAction<UpdateWidgetPayload>) => {
      const { id, updates } = action.payload;
      const widget = state.items[id];
      
      if (widget) {
        Object.assign(widget, {
          ...updates,
          updatedAt: new Date(),
        });
        state.lastUpdated = new Date();
      }
    },

    // Move widget (drag & drop)
    moveWidget: (state, action: PayloadAction<MoveWidgetPayload>) => {
      const { id, position } = action.payload;
      const widget = state.items[id];
      
      if (widget) {
        widget.position = position;
        widget.updatedAt = new Date();
        
        // Update layout array
        const layoutIndex = state.layout.findIndex(l => 
          l.x === widget.position.x && l.y === widget.position.y
        );
        if (layoutIndex !== -1) {
          state.layout[layoutIndex] = position;
        }
        
        state.lastUpdated = new Date();
      }
    },

    // Remove widget
    removeWidget: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const widget = state.items[id];
      
      if (widget) {
        delete state.items[id];
        
        // Remove from layout
        state.layout = state.layout.filter(l => 
          !(l.x === widget.position.x && l.y === widget.position.y)
        );
        
        // Clear selection if this widget was selected
        if (state.selectedWidget === id) {
          state.selectedWidget = null;
        }
        
        state.lastUpdated = new Date();
      }
    },

    // Select widget for editing
    selectWidget: (state, action: PayloadAction<string | null>) => {
      state.selectedWidget = action.payload;
    },

    // Toggle editing mode
    toggleEditMode: (state) => {
      state.isEditing = !state.isEditing;
      if (!state.isEditing) {
        state.selectedWidget = null;
      }
    },

    // Set editing mode
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
      if (!state.isEditing) {
        state.selectedWidget = null;
      }
    },

    // Clear all widgets
    clearAllWidgets: (state) => {
      state.items = {};
      state.layout = [];
      state.selectedWidget = null;
      state.lastUpdated = new Date();
    },

    // Load widgets from saved state
    loadWidgets: (state, action: PayloadAction<{ items: Record<string, BaseWidget>; layout: WidgetPosition[] }>) => {
      const { items, layout } = action.payload;
      state.items = items;
      state.layout = layout;
      state.lastUpdated = new Date();
    },

    // Bulk update layout (for drag & drop operations)
    updateLayout: (state, action: PayloadAction<WidgetPosition[]>) => {
      state.layout = action.payload;
      
      // Update individual widget positions
      action.payload.forEach((pos, index) => {
        const widget = Object.values(state.items)[index];
        if (widget) {
          widget.position = pos;
          widget.updatedAt = new Date();
        }
      });
      
      state.lastUpdated = new Date();
    },

    // Add demo widgets for testing
    addDemoWidgets: (state) => {
      // Clear existing widgets first
      state.items = {};
      state.layout = [];
      
      // Add demo widgets
      const demoWidgets: CreateWidgetPayload[] = [
        {
          type: 'stock-quote',
          title: 'Apple Inc.',
          position: { x: 0, y: 0, w: 4, h: 3 },
          config: { symbol: 'AAPL', showVolume: true }
        },
        {
          type: 'watchlist',
          title: 'My Watchlist',
          position: { x: 4, y: 0, w: 8, h: 4 },
          config: { symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA'], maxSymbols: 8 }
        },
        {
          type: 'price-chart',
          title: 'AAPL Chart',
          position: { x: 0, y: 3, w: 6, h: 4 },
          config: { symbol: 'AAPL', chartType: 'candlestick', timeframe: '1D' }
        },
        {
          type: 'news-feed',
          title: 'Market News',
          position: { x: 6, y: 3, w: 6, h: 4 },
          config: { categories: ['general'], maxArticles: 5 }
        }
      ];

      // Create widgets using the same logic as addWidget
      demoWidgets.forEach((payload, index) => {
        const id = `demo-widget-${index}`;
        const template = WIDGET_TEMPLATES.find(t => t.type === payload.type);
        
        const widget: BaseWidget = {
          id,
          type: payload.type,
          title: payload.title || template?.name || `${payload.type} Widget`,
          position: {
            x: payload.position?.x ?? template?.defaultSize.x ?? 0,
            y: payload.position?.y ?? template?.defaultSize.y ?? 0,
            w: payload.position?.w ?? template?.defaultSize.w ?? 4,
            h: payload.position?.h ?? template?.defaultSize.h ?? 3,
          },
          size: {
            minW: 2,
            minH: 2,
            maxW: 12,
            maxH: 8,
          },
          config: {
            ...template?.defaultConfig,
            ...payload.config,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        state.items[id] = widget;
        state.layout.push(widget.position);
      });
      
      state.lastUpdated = new Date();
    },
  },
});

export const {
  addWidget,
  updateWidget,
  moveWidget,
  removeWidget,
  selectWidget,
  toggleEditMode,
  setEditMode,
  clearAllWidgets,
  loadWidgets,
  updateLayout,
  addDemoWidgets,
} = widgetSlice.actions;

export default widgetSlice.reducer;
