"use client";

import { useSelector, useDispatch } from "react-redux";
import { Plus, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DraggableGrid } from "@/components/dashboard/draggable-grid";
import { RootState } from "@/store/store";
import { 
  addWidget, 
  removeWidget, 
  selectWidget, 
  toggleEditMode, 
  addDemoWidgets 
} from "@/store/slices/widgetSlice";
import { BaseWidget, WidgetType } from "@/types/widget";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { items: widgets, selectedWidget, isEditing } = useSelector((state: RootState) => state.widgets);
  
  const widgetArray = Object.values(widgets);

  const handleAddWidget = (type: WidgetType) => {
    dispatch(addWidget({ type }));
  };

  const handleDeleteWidget = (widgetId: string) => {
    dispatch(removeWidget(widgetId));
  };

  const handleSelectWidget = (widgetId: string) => {
    dispatch(selectWidget(widgetId));
  };

  const handleToggleEdit = () => {
    dispatch(toggleEditMode());
  };

  const handleAddDemoWidgets = () => {
    dispatch(addDemoWidgets());
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {widgetArray.length} widget{widgetArray.length !== 1 ? 's' : ''}
              </Badge>
              {isEditing && (
                <Badge variant="default" className="text-xs">
                  Edit Mode
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {widgetArray.length > 0 && (
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={handleToggleEdit}
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Done
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={() => handleAddWidget('stock-quote')}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {widgetArray.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <div className="text-2xl">📊</div>
            </div>
            <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your personalized financial dashboard by adding widgets to track stocks, 
              news, charts, and more.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleAddDemoWidgets} variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Add Demo Widgets
              </Button>
              <Button onClick={() => handleAddWidget('stock-quote')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Widget
              </Button>
            </div>
            
            <div className="mt-8 text-sm text-muted-foreground">
              💡 Tip: Configure your APIs first in Settings for live data
            </div>
          </div>
        ) : (
          <DraggableGrid
            isEditing={isEditing}
            onEditWidget={(widget) => console.log('Edit widget:', widget.id)}
            onDeleteWidget={handleDeleteWidget}
            onSelectWidget={handleSelectWidget}
          />
        )}

        {widgetArray.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button
              onClick={() => handleAddWidget('stock-quote')}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
