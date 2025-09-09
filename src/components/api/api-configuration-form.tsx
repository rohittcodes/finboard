"use client";

import { useState } from "react";
import { Eye, EyeOff, TestTube, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ApiProvider, ApiCredentials, UserApiConfig } from "@/types/api";
import { ApiAdapterFactory } from "@/lib/adapters";

interface ApiConfigurationFormProps {
  provider: ApiProvider;
  existingConfig?: UserApiConfig;
  onSave: (config: UserApiConfig) => void;
  onCancel: () => void;
}

export function ApiConfigurationForm({ 
  provider, 
  existingConfig, 
  onSave, 
  onCancel 
}: ApiConfigurationFormProps) {
  const [formData, setFormData] = useState({
    name: existingConfig?.name || `${provider.name} API`,
    apiKey: existingConfig?.credentials.apiKey || "",
    baseUrl: existingConfig?.credentials.baseUrl || provider.baseUrl,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    if (!formData.apiKey.trim()) {
      setTestResult({
        success: false,
        message: "Please enter an API key first"
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const credentials: ApiCredentials = {
        apiKey: formData.apiKey.trim(),
        baseUrl: formData.baseUrl.trim() || provider.baseUrl,
        rateLimitPerMinute: provider.rateLimitPerMinute,
      };

      const isValid = await ApiAdapterFactory.validateCredentials(provider.id, credentials);
      
      setTestResult({
        success: isValid,
        message: isValid 
          ? "✅ Connection successful! API credentials are valid."
          : "❌ Connection failed. Please check your API key and try again."
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Test failed: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) {
      setTestResult({
        success: false,
        message: "Please fill in all required fields"
      });
      return;
    }

    const config: UserApiConfig = {
      id: existingConfig?.id || `${provider.id}-${Date.now()}`,
      providerId: provider.id,
      name: formData.name.trim(),
      credentials: {
        apiKey: formData.apiKey.trim(),
        baseUrl: formData.baseUrl.trim() || provider.baseUrl,
        rateLimitPerMinute: provider.rateLimitPerMinute,
      },
      isActive: true,
      createdAt: existingConfig?.createdAt || new Date(),
      lastUsed: existingConfig?.lastUsed,
    };

    onSave(config);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {existingConfig ? "Edit" : "Configure"} {provider.name}
              <Badge variant="outline">{provider.id}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {provider.description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Configuration Name */}
        <div className="space-y-2">
          <Label htmlFor="config-name">Configuration Name *</Label>
          <Input
            id="config-name"
            placeholder="e.g., My Alpha Vantage API"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Give this configuration a memorable name
          </p>
        </div>

        {/* API Key */}
        {provider.requiresApiKey && (
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key *</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your API key..."
                value={formData.apiKey}
                onChange={(e) => handleInputChange("apiKey", e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href={provider.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {provider.name} documentation
              </a>
            </p>
          </div>
        )}

        {/* Base URL (Advanced) */}
        <div className="space-y-2">
          <Label htmlFor="base-url">Base URL (Optional)</Label>
          <Input
            id="base-url"
            placeholder={provider.baseUrl}
            value={formData.baseUrl}
            onChange={(e) => handleInputChange("baseUrl", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use the default: {provider.baseUrl}
          </p>
        </div>

        {/* Provider Info */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-medium">Provider Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Rate Limit:</span>
              <span className="ml-2 font-medium">{provider.rateLimitPerMinute}/min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Features:</span>
              <span className="ml-2 font-medium">{provider.supportedFeatures.length}</span>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`rounded-lg p-3 text-sm ${
            testResult.success 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isLoading || !formData.apiKey.trim()}
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isLoading ? "Testing..." : "Test Connection"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.apiKey.trim()}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {existingConfig ? "Update" : "Save"} Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

