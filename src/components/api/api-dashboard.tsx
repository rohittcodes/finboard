"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, Trash2, Activity, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiProviderCard } from "./api-provider-card";
import { ApiConfigurationForm } from "./api-configuration-form";
import { CustomApiWizard } from "./custom-api-wizard";
import { ApiProvider, UserApiConfig } from "@/types/api";
import { CustomApiConfiguration } from "@/types/custom-api";
import { ApiAdapterRegistry, ApiAdapterFactory } from "@/lib/adapters";
import { CustomApiAdapter } from "@/lib/adapters/customAdapter";

interface ApiDashboardProps {
  onConfigurationChange?: (configs: UserApiConfig[]) => void;
}

export function ApiDashboard({ onConfigurationChange }: ApiDashboardProps) {
  const [providers] = useState<ApiProvider[]>(() => ApiAdapterRegistry.getAllProviders());
  const [configurations, setConfigurations] = useState<UserApiConfig[]>([]);
  const [customConfigs, setCustomConfigs] = useState<CustomApiConfiguration[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(null);
  const [editingConfig, setEditingConfig] = useState<UserApiConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCustomWizard, setShowCustomWizard] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('finboard-api-configs');
    const savedCustom = localStorage.getItem('finboard-custom-api-configs');
    
    if (saved) {
      try {
        const configs = JSON.parse(saved);
        setConfigurations(configs);
        onConfigurationChange?.(configs);
      } catch (error) {
        console.error('Failed to load API configurations:', error);
      }
    }

    if (savedCustom) {
      try {
        const customConfigs = JSON.parse(savedCustom);
        setCustomConfigs(customConfigs);
        
        customConfigs.forEach((config: CustomApiConfiguration) => {
          if (config.validated) {
            const adapter = new CustomApiAdapter(config);
            ApiAdapterRegistry.register(adapter.provider.id, () => new CustomApiAdapter(config));
          }
        });
      } catch (error) {
        console.error('Failed to load custom API configurations:', error);
      }
    }
  }, [onConfigurationChange]);

  // Save configurations to localStorage
  const saveConfigurations = (configs: UserApiConfig[]) => {
    localStorage.setItem('finboard-api-configs', JSON.stringify(configs));
    setConfigurations(configs);
    onConfigurationChange?.(configs);
  };

  // Save custom configurations
  const saveCustomConfigurations = (configs: CustomApiConfiguration[]) => {
    localStorage.setItem('finboard-custom-api-configs', JSON.stringify(configs));
    setCustomConfigs(configs);
  };

  const handleConfigureProvider = (provider: ApiProvider) => {
    setSelectedProvider(provider);
    setEditingConfig(null);
    setShowForm(true);
  };

  const handleManageProvider = (provider: ApiProvider) => {
    const existingConfig = configurations.find(config => config.providerId === provider.id);
    if (existingConfig) {
      setSelectedProvider(provider);
      setEditingConfig(existingConfig);
      setShowForm(true);
    }
  };

  const handleSaveConfiguration = (config: UserApiConfig) => {
    const updatedConfigs = editingConfig
      ? configurations.map(c => c.id === config.id ? config : c)
      : [...configurations, config];
    
    saveConfigurations(updatedConfigs);
    setShowForm(false);
    setSelectedProvider(null);
    setEditingConfig(null);
  };

  const handleDeleteConfiguration = (configId: string) => {
    const updatedConfigs = configurations.filter(c => c.id !== configId);
    saveConfigurations(updatedConfigs);
    ApiAdapterFactory.clearCache(configId);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedProvider(null);
    setEditingConfig(null);
  };

  const handleSaveCustomConfiguration = (config: CustomApiConfiguration) => {
    const updatedConfigs = [...customConfigs, config];
    saveCustomConfigurations(updatedConfigs);
    
    // Register the custom adapter if validated
    if (config.validated) {
      const adapter = new CustomApiAdapter(config);
      ApiAdapterRegistry.register(adapter.provider.id, () => new CustomApiAdapter(config));
    }
    
    setShowCustomWizard(false);
  };

  const handleCancelCustomWizard = () => {
    setShowCustomWizard(false);
  };

  const isProviderConfigured = (providerId: string) => {
    return configurations.some(config => config.providerId === providerId);
  };

  const getProviderConfig = (providerId: string) => {
    return configurations.find(config => config.providerId === providerId);
  };

  if (showForm && selectedProvider) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <ApiConfigurationForm
            provider={selectedProvider}
            existingConfig={editingConfig || undefined}
            onSave={handleSaveConfiguration}
            onCancel={handleCancelForm}
          />
        </div>
      </div>
    );
  }

  if (showCustomWizard) {
    return (
      <CustomApiWizard
        onSave={handleSaveCustomConfiguration}
        onCancel={handleCancelCustomWizard}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">API Configuration</h1>
          <p className="text-muted-foreground">
            Configure financial data providers to power your dashboard
          </p>
        </div>
        <Button onClick={() => setShowCustomWizard(true)} className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Add Custom API
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Activity className="h-8 w-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">{configurations.length + customConfigs.length}</p>
              <p className="text-sm text-muted-foreground">Configured APIs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Settings className="h-8 w-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">{providers.length}</p>
              <p className="text-sm text-muted-foreground">Available Providers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Plus className="h-8 w-8 text-primary mr-4" />
            <div>
              <p className="text-2xl font-bold">{providers.length - configurations.length + customConfigs.length}</p>
              <p className="text-sm text-muted-foreground">Available Providers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configured APIs */}
      {configurations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Configured APIs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configurations.map((config) => {
              const provider = providers.find(p => p.id === config.providerId);
              if (!provider) return null;

              return (
                <Card key={config.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <CardDescription>{provider.name}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageProvider(provider)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfiguration(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Rate Limit:</span>
                        <span>{provider.rateLimitPerMinute}/min</span>
                      </div>
                      {config.lastUsed && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Used:</span>
                          <span>{new Date(config.lastUsed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Providers */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available API Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ApiProviderCard
              key={provider.id}
              provider={provider}
              isConfigured={isProviderConfigured(provider.id)}
              onConfigure={handleConfigureProvider}
              onManage={handleManageProvider}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {configurations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No APIs Configured</h3>
            <p className="text-muted-foreground mb-4">
              Get started by configuring your first financial data API
            </p>
            <Button onClick={() => handleConfigureProvider(providers[0])}>
              Configure Your First API
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

