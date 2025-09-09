"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2, TestTube } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomApiConfiguration, DetectedApiStructure, ApiFieldMapping } from "@/types/custom-api";
import { ApiStructureDetector } from "@/lib/api-structure-detector";

interface CustomApiWizardProps {
  onSave: (config: CustomApiConfiguration) => void;
  onCancel: () => void;
  existingConfig?: CustomApiConfiguration;
}

type WizardStep = 'basic' | 'test' | 'mapping' | 'review';

export function CustomApiWizard({ onSave, onCancel, existingConfig }: CustomApiWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [basicInfo, setBasicInfo] = useState({
    name: existingConfig?.name || '',
    description: existingConfig?.description || '',
    baseUrl: existingConfig?.baseUrl || '',
    testSymbol: existingConfig?.testSymbol || 'AAPL',
    rateLimitPerMinute: existingConfig?.rateLimitPerMinute || 60,
  });

  const [authConfig, setAuthConfig] = useState({
    authType: existingConfig?.authType || 'api_key' as const,
    apiKeyParam: existingConfig?.authConfig.apiKeyParam || 'apikey',
    headerName: existingConfig?.authConfig.headerName || 'X-API-Key',
    headerPrefix: existingConfig?.authConfig.headerPrefix || '',
  });

  const [endpoints, setEndpoints] = useState({
    quote: existingConfig?.endpoints.quote?.url || '',
  });

  const [credentials, setCredentials] = useState({
    apiKey: '',
  });

  // Detection results
  const [detectedStructure, setDetectedStructure] = useState<DetectedApiStructure | null>(null);
  const [fieldMappings, setFieldMappings] = useState<ApiFieldMapping[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const steps: Array<{ id: WizardStep; title: string; description: string }> = [
    { id: 'basic', title: 'Basic Info', description: 'API details and authentication' },
    { id: 'test', title: 'Test & Detect', description: 'Test connection and detect structure' },
    { id: 'mapping', title: 'Field Mapping', description: 'Map API fields to our format' },
    { id: 'review', title: 'Review', description: 'Review and save configuration' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleNext = () => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    setCurrentStep(steps[nextIndex].id);
  };

  const handlePrevious = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStep(steps[prevIndex].id);
  };

  const handleTestApi = async () => {
    if (!basicInfo.baseUrl || !endpoints.quote || !credentials.apiKey) {
      setTestResult({
        success: false,
        message: 'Please fill in all required fields first'
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // Build auth headers
      const authHeaders: Record<string, string> = {};
      if (authConfig.authType === 'api_key' && authConfig.headerName) {
        authHeaders[authConfig.headerName] = `${authConfig.headerPrefix}${credentials.apiKey}`;
      }

      // Test and detect structure
      const result = await ApiStructureDetector.validateCustomApi(
        basicInfo.baseUrl,
        endpoints.quote,
        authHeaders,
        basicInfo.testSymbol
      );

      if (result.isValid && result.detectedStructure) {
        setDetectedStructure(result.detectedStructure);
        setFieldMappings(result.detectedStructure.suggestedMappings);
        setTestResult({
          success: true,
          message: `✅ Connection successful! Detected ${result.detectedStructure.suggestedMappings.length} field mappings with ${result.detectedStructure.confidence} confidence.`
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ ${result.errors[0]?.message || 'Connection failed'}`
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const config: CustomApiConfiguration = {
      id: existingConfig?.id || `custom-${Date.now()}`,
      name: basicInfo.name,
      description: basicInfo.description,
      baseUrl: basicInfo.baseUrl,
      authType: authConfig.authType,
      authConfig: {
        apiKeyParam: authConfig.apiKeyParam,
        headerName: authConfig.headerName,
        headerPrefix: authConfig.headerPrefix,
      },
      endpoints: {
        quote: {
          name: 'Quote',
          url: endpoints.quote,
          method: 'GET',
          description: 'Get stock quote data'
        }
      },
      fieldMappings: {
        quote: fieldMappings
      },
      rateLimitPerMinute: basicInfo.rateLimitPerMinute,
      testSymbol: basicInfo.testSymbol,
      validated: testResult?.success || false,
      lastValidated: testResult?.success ? new Date() : undefined,
      createdAt: existingConfig?.createdAt || new Date(),
      updatedAt: new Date()
    };

    onSave(config);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-name">API Name *</Label>
                <Input
                  id="api-name"
                  placeholder="e.g., My Custom Stock API"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="api-description">Description</Label>
                <Input
                  id="api-description"
                  placeholder="Brief description of this API"
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="base-url">Base URL *</Label>
                <Input
                  id="base-url"
                  placeholder="https://api.example.com"
                  value={basicInfo.baseUrl}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="quote-endpoint">Quote Endpoint *</Label>
                <Input
                  id="quote-endpoint"
                  placeholder="/quote/{symbol} or /stock?symbol={symbol}"
                  value={endpoints.quote}
                  onChange={(e) => setEndpoints(prev => ({ ...prev, quote: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {`{symbol}`} as placeholder for stock symbols
                </p>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Authentication</h4>
              
              <div>
                <Label htmlFor="auth-type">Authentication Type</Label>
                <select
                  id="auth-type"
                  value={authConfig.authType}
                  onChange={(e) => setAuthConfig(prev => ({ ...prev, authType: e.target.value as any }))}
                  className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="api_key">API Key in Header</option>
                  <option value="bearer_token">Bearer Token</option>
                  <option value="none">No Authentication</option>
                </select>
              </div>

              {authConfig.authType !== 'none' && (
                <>
                  <div>
                    <Label htmlFor="header-name">Header Name</Label>
                    <Input
                      id="header-name"
                      placeholder="X-API-Key"
                      value={authConfig.headerName}
                      onChange={(e) => setAuthConfig(prev => ({ ...prev, headerName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="header-prefix">Header Prefix (Optional)</Label>
                    <Input
                      id="header-prefix"
                      placeholder="Bearer "
                      value={authConfig.headerPrefix}
                      onChange={(e) => setAuthConfig(prev => ({ ...prev, headerPrefix: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Testing</h4>
              
              <div>
                <Label htmlFor="test-symbol">Test Symbol</Label>
                <Input
                  id="test-symbol"
                  placeholder="AAPL"
                  value={basicInfo.testSymbol}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, testSymbol: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={basicInfo.rateLimitPerMinute}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, rateLimitPerMinute: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="api-key">API Key *</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={credentials.apiKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleTestApi}
                disabled={isLoading || !credentials.apiKey}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test API Connection
              </Button>

              {testResult && (
                <div className={`rounded-lg p-4 ${
                  testResult.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-sm">{testResult.message}</div>
                  </div>
                </div>
              )}

              {detectedStructure && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Detected Structure</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fields Detected:</span>
                      <span className="ml-2 font-medium">{detectedStructure.detectedFields.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <Badge 
                        variant={
                          detectedStructure.confidence === 'high' ? 'default' : 
                          detectedStructure.confidence === 'medium' ? 'secondary' : 'outline'
                        }
                        className="ml-2"
                      >
                        {detectedStructure.confidence}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Sample Response:</span>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(detectedStructure.sampleResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Field Mappings</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Review and adjust how API fields map to our standard format
              </p>
            </div>

            <div className="space-y-4">
              {fieldMappings.map((mapping, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">{mapping.targetField}</Label>
                      {mapping.required && (
                        <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                      )}
                    </div>
                    <Badge variant="secondary">{mapping.dataType}</Badge>
                  </div>
                  
                  <div>
                    <Label htmlFor={`source-${index}`} className="text-sm">Source Field Path</Label>
                    <Input
                      id={`source-${index}`}
                      value={mapping.sourceField}
                      onChange={(e) => {
                        const updated = [...fieldMappings];
                        updated[index] = { ...updated[index], sourceField: e.target.value };
                        setFieldMappings(updated);
                      }}
                      placeholder="e.g., data.price or result[0].last"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`transform-${index}`} className="text-sm">Transform</Label>
                    <select
                      id={`transform-${index}`}
                      value={mapping.transform || 'none'}
                      onChange={(e) => {
                        const updated = [...fieldMappings];
                        updated[index] = { ...updated[index], transform: e.target.value as any };
                        setFieldMappings(updated);
                      }}
                      className="w-full h-9 px-3 py-1 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="none">No transform</option>
                      <option value="uppercase">To uppercase</option>
                      <option value="lowercase">To lowercase</option>
                      <option value="parse_float">Parse as number</option>
                      <option value="parse_date">Parse as date</option>
                      <option value="multiply_100">Multiply by 100</option>
                      <option value="divide_100">Divide by 100</option>
                    </select>
                  </div>
                </div>
              ))}

              {fieldMappings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No field mappings detected. Please test the API first.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Configuration Review</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Review your custom API configuration before saving
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {basicInfo.name}</div>
                  <div><strong>Description:</strong> {basicInfo.description || 'None'}</div>
                  <div><strong>Base URL:</strong> {basicInfo.baseUrl}</div>
                  <div><strong>Rate Limit:</strong> {basicInfo.rateLimitPerMinute}/min</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Type:</strong> {authConfig.authType}</div>
                  {authConfig.authType !== 'none' && (
                    <>
                      <div><strong>Header:</strong> {authConfig.headerName}</div>
                      <div><strong>Prefix:</strong> {authConfig.headerPrefix || 'None'}</div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Quote:</strong> {endpoints.quote}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Field Mappings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Mapped Fields:</strong> {fieldMappings.length}</div>
                  <div><strong>Required Fields:</strong> {fieldMappings.filter(m => m.required).length}</div>
                  {testResult?.success && (
                    <Badge variant="default" className="text-xs">✓ Validated</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom API Configuration</CardTitle>
          <CardDescription>
            Add your own financial data API with automatic field mapping
          </CardDescription>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStepIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 ml-6 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? onCancel : handlePrevious}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStepIndex === 0 ? 'Cancel' : 'Previous'}
            </Button>

            <div className="flex gap-2">
              {currentStep === 'review' ? (
                <Button
                  onClick={handleSave}
                  disabled={!testResult?.success}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 'basic' && (!basicInfo.name || !basicInfo.baseUrl || !endpoints.quote)) ||
                    (currentStep === 'test' && !testResult?.success)
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
