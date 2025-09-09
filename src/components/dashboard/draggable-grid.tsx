"use client";

import { useEffect, useState, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { updateLayout, loadWidgets } from "@/store/slices/widgetSlice";
import { BaseWidgetWrapper } from "@/components/widgets/base-widget";
import { RealtimeStockWidget } from "@/components/widgets/realtime-stock-widget";
import { WatchlistWidget } from "@/components/widgets/watchlist-widget";
import { BaseWidget } from "@/types/widget";
import { persistence } from "@/lib/persistence";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableGridProps {
  isEditing: boolean;
  onEditWidget?: (widget: BaseWidget) => void;
  onDeleteWidget?: (widgetId: string) => void;
  onSelectWidget?: (widgetId: string) => void;
}

export function DraggableGrid({
  isEditing,
  onEditWidget,
  onDeleteWidget,
  onSelectWidget
}: DraggableGridProps) {
  const dispatch = useDispatch();
  const { items: widgets, selectedWidget } = useSelector((state: RootState) => state.widgets);
  const [mounted, setMounted] = useState(false);

  const widgetArray = Object.values(widgets);

  const layouts = {
    lg: widgetArray.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: widget.size.minW || 2,
      minH: widget.size.minH || 2,
      maxW: widget.size.maxW || 12,
      maxH: widget.size.maxH || 8,
    })),
    md: widgetArray.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: Math.min(widget.position.w, 8),
      h: widget.position.h,
      minW: widget.size.minW || 2,
      minH: widget.size.minH || 2,
    })),
    sm: widgetArray.map(widget => ({
      i: widget.id,
      x: 0,
      y: widget.position.y,
      w: Math.min(widget.position.w, 4),
      h: widget.position.h,
      minW: 2,
      minH: widget.size.minH || 2,
    })),
    xs: widgetArray.map(widget => ({
      i: widget.id,
      x: 0,
      y: widget.position.y,
      w: 2,
      h: widget.position.h,
      minW: 2,
      minH: widget.size.minH || 2,
    }))
  };

  const handleLayoutChange = useCallback(async (layout: Layout[], layouts: any) => {
    if (!mounted) return;

    try {
      const updatedPositions = layout.map(item => ({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));

      dispatch(updateLayout(updatedPositions));

      await persistence.saveWidgetLayout(layouts);
      
      const currentWidgets = Object.values(widgets);
      const updatedWidgets: Record<string, BaseWidget> = {};
      
      currentWidgets.forEach((widget, index) => {
        const layoutItem = layout.find(l => l.i === widget.id);
        if (layoutItem) {
          updatedWidgets[widget.id] = {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
            updatedAt: new Date(),
          };
        } else {
          updatedWidgets[widget.id] = widget;
        }
      });

      await persistence.saveWidgets(updatedWidgets);
    } catch (error) {
      console.error('Failed to persist layout changes:', error);
    }
  }, [dispatch, widgets, mounted]);

  useEffect(() => {
    const hydrateWidgets = async () => {
      try {
        const savedWidgets = await persistence.loadWidgets();
        const savedLayout = await persistence.loadWidgetLayout();

        if (savedWidgets && Object.keys(savedWidgets).length > 0) {
          console.log('Hydrating widgets from persistent storage');
          
          const layoutArray = (savedLayout as any)?.lg || Object.values(savedWidgets).map(w => w.position);
          
          dispatch(loadWidgets({
            items: savedWidgets,
            layout: layoutArray
          }));
        }
      } catch (error) {
        console.error('Failed to hydrate widgets:', error);
      } finally {
        setMounted(true);
      }
    };

    hydrateWidgets();
  }, [dispatch]);

  const renderWidgetContent = (widget: BaseWidget) => {
    switch (widget.type) {
      case 'stock-quote':
        return (
          <RealtimeStockWidget
            symbol={widget.config.symbol || 'AAPL'}
            providerId={widget.config.providerId}
            showWebSocketStatus={false}
          />
        );
      
      case 'watchlist':
        return (
          <WatchlistWidget
            initialSymbols={widget.config.symbols || ['AAPL']}
            providerId={widget.config.providerId}
            maxSymbols={widget.config.maxSymbols || 10}
          />
        );
      
      case 'price-chart':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-medium">Price Chart</div>
              <div className="text-sm">Coming Soon</div>
            </div>
          </div>
        );
      
      case 'news-feed':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">📰</div>
              <div className="font-medium">News Feed</div>
              <div className="text-sm">Coming Soon</div>
            </div>
          </div>
        );
      
      case 'market-overview':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">🌍</div>
              <div className="font-medium">Market Overview</div>
              <div className="text-sm">Coming Soon</div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-medium">Widget: {widget.type}</div>
              <div className="text-sm">Not implemented yet</div>
            </div>
          </div>
        );
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      onLayoutChange={handleLayoutChange}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 8, sm: 4, xs: 2, xxs: 2 }}
      rowHeight={80}
      isDraggable={isEditing}
      isResizable={isEditing}
      compactType="vertical"
      preventCollision={false}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
      transformScale={1}
    >
      {widgetArray.map((widget) => (
        <div key={widget.id} className="widget-container">
          <BaseWidgetWrapper
            widget={widget}
            isEditing={isEditing}
            isSelected={selectedWidget === widget.id}
            onEdit={onEditWidget}
            onDelete={onDeleteWidget}
            onSelect={onSelectWidget}
          >
            {renderWidgetContent(widget)}
          </BaseWidgetWrapper>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
