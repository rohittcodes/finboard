"use client";

import { useState } from "react";
import { MoreHorizontal, Settings, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BaseWidget } from "@/types/widget";

interface BaseWidgetProps {
  widget: BaseWidget;
  isEditing?: boolean;
  isSelected?: boolean;
  onEdit?: (widget: BaseWidget) => void;
  onDelete?: (widgetId: string) => void;
  onSelect?: (widgetId: string) => void;
  children: React.ReactNode;
}

export function BaseWidgetWrapper({
  widget,
  isEditing = false,
  isSelected = false,
  onEdit,
  onDelete,
  onSelect,
  children
}: BaseWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleEdit = () => {
    onEdit?.(widget);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${widget.title}"?`)) {
      onDelete?.(widget.id);
    }
    setShowMenu(false);
  };

  const handleSelect = () => {
    if (isEditing) {
      onSelect?.(widget.id);
    }
  };

  return (
    <Card 
      className={`relative transition-all duration-200 ${
        isEditing 
          ? 'cursor-move hover:shadow-lg' 
          : 'hover:shadow-md'
      } ${
        isSelected 
          ? 'ring-2 ring-primary ring-offset-2' 
          : ''
      }`}
      onClick={handleSelect}
    >
      {isEditing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 p-2 bg-background border rounded-lg shadow-sm">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Drag to move</span>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{widget.title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {widget.type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  <div className="absolute right-0 top-8 z-20 bg-background border rounded-lg shadow-lg py-1 min-w-[120px]">
                    <button
                      onClick={handleEdit}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {children}
      </CardContent>

      {isEditing && isSelected && (
        <div className="absolute bottom-2 left-2 right-2 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm rounded px-2 py-1">
          <div className="flex justify-between">
            <span>Position: {widget.position.x}, {widget.position.y}</span>
            <span>Size: {widget.position.w}×{widget.position.h}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
