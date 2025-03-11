import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key, CheckCircle2 } from "lucide-react";

interface ApiConfig {
  id: string;
  name: string;
  key: string;
  deviceId: string; // Added deviceId field
  type: 'sms' | 'whatsapp';
  isActive?: boolean;
}

export default function ApiSettingsPage() {
  const { toast } = useToast();
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newDeviceId, setNewDeviceId] = useState(''); // Added device ID state
  const [newApiType, setNewApiType] = useState<'sms' | 'whatsapp'>('sms');
  const [devMode, setDevMode] = useState(false);

  // Load saved configurations from localStorage
  useEffect(() => {
    const savedConfigs = localStorage.getItem('smsApiConfigs');
    if (savedConfigs) {
      setApiConfigs(JSON.parse(savedConfigs));
    }
    const savedDevMode = localStorage.getItem('smsDevMode');
    if (savedDevMode) {
      setDevMode(JSON.parse(savedDevMode));
    }
  }, []);

  // Save configurations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('smsApiConfigs', JSON.stringify(apiConfigs));
    // Also save to the server-side file
    fetch('/api/save-api-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiConfigs)
    }).catch(error => {
      console.error('Failed to save API config to server:', error);
    });
  }, [apiConfigs]);

  const handleAddApi = () => {
    if (!newApiName.trim() || !newApiKey.trim() || !newDeviceId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields: name, API key, and device ID.",
        variant: "destructive"
      });
      return;
    }

    const newConfig: ApiConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: newApiName.trim(),
      key: newApiKey.trim(),
      deviceId: newDeviceId.trim(),
      type: newApiType,
      isActive: false
    };

    setApiConfigs(prev => [...prev, newConfig]);
    setNewApiName('');
    setNewApiKey('');
    setNewDeviceId('');

    toast({
      title: "API Added",
      description: "The API configuration has been saved successfully."
    });
  };

  const handleDeleteApi = (id: string) => {
    setApiConfigs(prev => prev.filter(config => config.id !== id));
    toast({
      title: "API Removed",
      description: "The API configuration has been removed."
    });
  };

  const handleSetActiveApi = (id: string, type: 'sms' | 'whatsapp') => {
    setApiConfigs(prev => prev.map(config => ({
      ...config,
      isActive: config.type === type ? config.id === id : config.isActive
    })));

    toast({
      title: "API Activated",
      description: `This API is now active for ${type.toUpperCase()} messages.`
    });
  };

  const handleDevModeToggle = (checked: boolean) => {
    setDevMode(checked);
    toast({
      title: checked ? "Developer Mode Enabled" : "Developer Mode Disabled",
      description: checked
        ? "All SMS will be sent to the test number: +923133469238"
        : "SMS will be sent to actual recipients"
    });
  };

  const handleTestSMS = async (apiId: string) => {
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "This is a test message from your School Management System"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test SMS');
      }

      toast({
        title: "Test SMS Sent",
        description: "Please check your test phone number for the message.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test SMS",
        variant: "destructive"
      });
    }
  };


  const renderApiSection = (type: 'sms' | 'whatsapp') => {
    const typeConfigs = apiConfigs.filter(config => config.type === type);
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{type === 'sms' ? 'SMS Gateway APIs' : 'WhatsApp APIs'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeConfigs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No {type === 'sms' ? 'SMS Gateway' : 'WhatsApp'} APIs configured
              </p>
            ) : (
              typeConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-4 bg-muted rounded-lg ${
                    config.isActive ? 'border-2 border-primary' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{config.name}</p>
                      {config.isActive && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Key className="h-4 w-4 mr-1" />
                      <span>••••••••{config.key.slice(-4)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!config.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActiveApi(config.id, config.type)}
                      >
                        Set Active
                      </Button>
                    )}
                    {config.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSMS(config.id)}
                      >
                        Test SMS
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteApi(config.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">API Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Developer Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Switch
                checked={devMode}
                onCheckedChange={handleDevModeToggle}
                id="dev-mode"
              />
              <Label htmlFor="dev-mode">
                Send all messages to test number (+923133469238)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add New API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-name">API Name</Label>
                <Input
                  id="api-name"
                  value={newApiName}
                  onChange={(e) => setNewApiName(e.target.value)}
                  placeholder="Enter API name"
                />
              </div>

              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter API key"
                  type="password"
                />
              </div>

              <div>
                <Label htmlFor="device-id">Device ID</Label>
                <Input
                  id="device-id"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="Enter device ID"
                />
              </div>

              <div>
                <Label>API Type</Label>
                <RadioGroup
                  value={newApiType}
                  onValueChange={(value) => setNewApiType(value as 'sms' | 'whatsapp')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms">SMS Gateway</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleAddApi} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add API
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Separate sections for SMS and WhatsApp APIs */}
        {renderApiSection('sms')}
        {renderApiSection('whatsapp')}
      </div>
    </div>
  );
}