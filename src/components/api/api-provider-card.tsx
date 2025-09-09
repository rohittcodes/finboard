"use client";

import { useState } from "react";
import { ExternalLink, Plus, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiProvider } from "@/types/api";

interface ApiProviderCardProps {
  provider: ApiProvider;
  isConfigured?: boolean;
  onConfigure: (provider: ApiProvider) => void;
  onManage?: (provider: ApiProvider) => void;
}

export function ApiProviderCard({ 
  provider, 
  isConfigured = false, 
  onConfigure, 
  onManage 
}: ApiProviderCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      className="transition-all duration-200 hover:shadow-md cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {provider.name}
              {isConfigured && (
                <Badge variant="secondary" className="text-xs">
                  Configured
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              {provider.description}
            </CardDescription>
          </div>
          <a
            href={provider.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Features */}
        <div>
          <h4 className="text-sm font-medium mb-2">Features</h4>
          <div className="flex flex-wrap gap-1">
            {provider.supportedFeatures.slice(0, 4).map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature.replace('-', ' ')}
              </Badge>
            ))}
            {provider.supportedFeatures.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{provider.supportedFeatures.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Rate Limit */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rate Limit:</span>
          <span className="font-medium">{provider.rateLimitPerMinute}/min</span>
        </div>

        {/* API Key Required */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">API Key:</span>
          <span className="font-medium">
            {provider.requiresApiKey ? "Required" : "Not Required"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isConfigured ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManage?.(provider)}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          ) : (
            <Button
              onClick={() => onConfigure(provider)}
              className="flex-1"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Configure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

