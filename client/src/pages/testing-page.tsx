
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestingPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">Testing Page</h1>
      <p className="text-gray-500 mb-6">This page is for testing functionality</p>
      
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Tests</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Testing Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button variant="default">Test Button</Button>
                <Button variant="outline">Secondary Test</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Testing Features</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                This section contains advanced testing features for development purposes.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="destructive">Reset Data</Button>
                <Button variant="secondary">Reload Config</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
