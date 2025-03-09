import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileDown,
  FileUp,
  Trash2,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function MigrationPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const exportSettings = async () => {
    try {
      const response = await fetch('/api/settings/export');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Settings exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export settings",
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/settings/import", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      setFile(null);
      toast({
        title: "Success",
        description: "Settings imported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import settings",
        variant: "destructive",
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/settings/clear", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All saved data has been cleared",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear data",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('settings', file);
    importMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Data Migration</h1>
      <p className="text-gray-500">Export or import your settings and preferences</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Download your current settings and preferences as a JSON file
            </p>
            <Button onClick={exportSettings} className="w-full">
              <FileDown className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Upload a previously exported settings file
            </p>
            <div className="space-y-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full"
              />
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4 mr-2" />
                    Import Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Clearing saved data will remove all your preferences and settings. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            onClick={() => clearDataMutation.mutate()}
            disabled={clearDataMutation.isPending}
            className="w-full"
          >
            {clearDataMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Clearing Data...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Saved Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
