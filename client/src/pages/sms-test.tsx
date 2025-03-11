
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

export default function SmsTestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSendSMS = async () => {
    if (!phone || !message || !apiKey || !deviceId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Format phone number if needed
      let formattedPhone = phone.replace('+', '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '92' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('92')) {
        formattedPhone = '92' + formattedPhone;
      }

      // Make direct API call
      const response = await axios.post(
        `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
        {
          recipients: [formattedPhone],
          message: message
        },
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      setResult(response.data);
      toast({
        title: "SMS Sent",
        description: "Message was sent successfully!",
        variant: "default"
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      if (axios.isAxiosError(error)) {
        setResult(error.response?.data || { error: error.message });
      } else {
        setResult({ error: 'Unknown error occurred' });
      }
      toast({
        title: "Failed to Send SMS",
        description: "Check the console for more details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>SMS Test Tool</CardTitle>
          <CardDescription>
            Test SMS sending with TextBee API directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Recipient Phone Number</Label>
              <Input
                id="phone"
                placeholder="+923123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pakistani numbers should start with +92 or 92
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {message.length} characters ({Math.ceil(message.length / 160)} SMS)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                placeholder="Your TextBee API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                placeholder="Your TextBee Device ID"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSendSMS}
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send SMS'}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">API Response:</h3>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
