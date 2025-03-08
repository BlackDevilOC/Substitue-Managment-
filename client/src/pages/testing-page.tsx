
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Testing Page</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                View the current status of the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is a testing page where you can experiment with different features.</p>
              <div className="mt-4">
                <Button>Run Test</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing Settings</CardTitle>
              <CardDescription>
                Configure the testing environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Settings content will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                View system logs and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-xs">
                  {`TypeError: csv is not a function
    at SubstituteManager.loadTimetable (/home/runner/workspace/server/substitute-manager.ts:1123:15)
    at SubstituteManager.autoAssignSubstitutes (/home/runner/workspace/server/substitute-manager.ts:252:14)`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
