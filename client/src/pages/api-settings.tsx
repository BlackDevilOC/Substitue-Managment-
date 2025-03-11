import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Key } from "lucide-react";

interface ApiConfig {
  id: string;
  name: string;
  key: string;
  type: 'sms' | 'whatsapp';
}

export default function ApiSettingsPage() {
  const { toast } = useToast();
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
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
  }, [apiConfigs]);

  // Save dev mode state
  useEffect(() => {
    localStorage.setItem('smsDevMode', JSON.stringify(devMode));
  }, [devMode]);

  const handleAddApi = () => {
    if (!newApiName.trim() || !newApiKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both name and API key.",
        variant: "destructive"
      });
      return;
    }

    const newConfig: ApiConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: newApiName.trim(),
      key: newApiKey.trim(),
      type: newApiType
    };

    setApiConfigs(prev => [...prev, newConfig]);
    setNewApiName('');
    setNewApiKey('');
    
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

  const handleDevModeToggle = (checked: boolean) => {
    setDevMode(checked);
    toast({
      title: checked ? "Developer Mode Enabled" : "Developer Mode Disabled",
      description: checked 
        ? "All SMS will be sent to the test number: +92133469238"
        : "SMS will be sent to actual recipients"
    });
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
                Send all messages to test number (+92133469238)
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

        <Card>
          <CardHeader>
            <CardTitle>Saved APIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {apiConfigs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No API configurations saved
                </p>
              ) : (
                apiConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{config.name}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Key className="h-4 w-4 mr-1" />
                        <span>••••••••{config.key.slice(-4)}</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-primary/10 rounded-full">
                        {config.type === 'sms' ? 'SMS Gateway' : 'WhatsApp'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteApi(config.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
