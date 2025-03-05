import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertCircle } from "lucide-react";

export default function FileUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<{
    timetable: boolean;
    substitute: boolean;
  }>({ timetable: false, substitute: false });

  const handleFileUpload = async (type: 'timetable' | 'substitute', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(prev => ({ ...prev, [type]: true }));
        toast({
          title: "Upload successful",
          description: data.message || `${type} file uploaded successfully`,
          variant: "success"
        });
      } else {
        toast({
          title: "Upload failed",
          description: data.error || `Failed to upload ${type} file`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.log("Upload error:", error);
      toast({
        title: "Upload error",
        description: `An error occurred during ${type} file upload`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessTimetables = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/process-timetables", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Processing successful",
          description: "Timetable file processed and schedule data organized successfully",
          variant: "success"
        });
      } else {
        throw new Error(data.error || 'Failed to process timetable file');
      }
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process timetable file. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">File Upload</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Timetable File</CardTitle>
            <CardDescription>Upload the timetable CSV file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload('timetable', e)}
                className="hidden"
                id="timetable-upload"
                disabled={isUploading}
              />
              <label htmlFor="timetable-upload">
                <Button
                  variant={uploadSuccess.timetable ? "outline" : "default"}
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {uploadSuccess.timetable ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Timetable
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Substitute File</CardTitle>
            <CardDescription>Upload the substitute teachers CSV file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload('substitute', e)}
                className="hidden"
                id="substitute-upload"
                disabled={isUploading}
              />
              <label htmlFor="substitute-upload">
                <Button
                  variant={uploadSuccess.substitute ? "outline" : "default"}
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {uploadSuccess.substitute ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Substitute List
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleProcessTimetables}
          disabled={isProcessing}
          className="w-full mt-4 col-span-1 md:col-span-2"
        >
          {isProcessing ? (
            <>Processing... <AlertCircle className="ml-2 h-4 w-4 animate-pulse" /></>
          ) : (
            "Process Timetables"
          )}
        </Button>
      </div>
    </div>
  );
}