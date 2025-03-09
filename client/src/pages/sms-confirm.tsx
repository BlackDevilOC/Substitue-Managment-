import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, Phone, Globe, MessageSquare } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  phone?: string;
}

interface LocationState {
  selectedTeachers: Teacher[];
  messageText: string;
}

export default function SmsConfirmPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sendMethod, setSendMethod] = useState<'api' | 'mobile' | 'whatsapp'>('api');

  // Parse state from URL query parameters since wouter doesn't support state
  const params = new URLSearchParams(window.location.search);
  const stateParam = params.get('state');
  const state: LocationState = stateParam ? JSON.parse(decodeURIComponent(stateParam)) : { selectedTeachers: [], messageText: '' };
  const { selectedTeachers = [], messageText = '' } = state;

  // State for teachers without phone numbers
  const [missingPhones, setMissingPhones] = useState<Record<string, string>>(
    selectedTeachers.reduce((acc, teacher) => {
      if (!teacher.phone) {
        acc[teacher.id] = '';
      }
      return acc;
    }, {} as Record<string, string>)
  );

  const handlePhoneChange = (teacherId: string, phone: string) => {
    setMissingPhones(prev => ({
      ...prev,
      [teacherId]: phone
    }));
  };

  const handleSendMessages = async () => {
    // Check if all required phone numbers are filled
    const missingPhoneNumbers = Object.values(missingPhones).some(phone => !phone);
    if (missingPhoneNumbers) {
      toast({
        title: "Missing Phone Numbers",
        description: "Please fill in all missing phone numbers before sending.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare the data for sending
      const teachersWithPhones = selectedTeachers.map(teacher => ({
        ...teacher,
        phone: teacher.phone || missingPhones[teacher.id]
      }));

      const response = await fetch('/api/send-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teachers: teachersWithPhones,
          message: messageText,
          method: sendMethod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send messages');
      }

      toast({
        title: "Success",
        description: `Messages sent successfully via ${sendMethod.toUpperCase()}`,
      });

      // Redirect to SMS history page
      setLocation('/sms-history');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send messages. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Confirm SMS Details</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sending Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={sendMethod}
            onValueChange={(value) => setSendMethod(value as 'api' | 'mobile' | 'whatsapp')}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="api" id="api" />
              <Label htmlFor="api" className="flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                API (Internet Required)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile" className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Mobile (Carrier Charges)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="whatsapp" id="whatsapp" />
              <Label htmlFor="whatsapp" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipients ({selectedTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedTeachers.map((teacher) => (
              <div key={teacher.id} className="flex flex-col space-y-2">
                <p className="font-medium">{teacher.name}</p>
                {teacher.phone ? (
                  <p className="text-sm text-muted-foreground">{teacher.phone}</p>
                ) : (
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    value={missingPhones[teacher.id]}
                    onChange={(e) => handlePhoneChange(teacher.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{messageText}</p>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => setLocation('/sms-send')}>
          Back
        </Button>
        <Button onClick={handleSendMessages}>
          <Send className="h-4 w-4 mr-2" />
          Send Messages
        </Button>
      </div>
    </div>
  );
}