
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function NotificationsPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="absence-notifications">Absence Notifications</Label>
            <Switch id="absence-notifications" />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="substitute-notifications">Substitute Assignments</Label>
            <Switch id="substitute-notifications" />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="schedule-notifications">Schedule Changes</Label>
            <Switch id="schedule-notifications" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      <p>You have no new notifications.</p>
    </div>
  );
}
