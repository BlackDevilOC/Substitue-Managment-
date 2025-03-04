import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function FileUploadPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (type: 'timetable' | 'substitute', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const authToken = localStorage.getItem('authToken') || JSON.stringify({ username: 'Rehan' })

      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to upload ${type} file`)
      }

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} file uploaded successfully`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to upload ${type} file. Please try again.`,
      })
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleProcessTimetables = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/process-timetables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process timetables')
      }

      toast({
        title: "Success",
        description: "Timetables processed and organized successfully",
      })
    } catch (error) {
      console.error('Processing error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process timetables. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Upload Files</h1>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Timetable File</CardTitle>
            <CardDescription>Upload the school timetable CSV file</CardDescription>
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
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
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
                  variant="outline"
                  className="cursor-pointer"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
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
          className="w-full mt-4"
        >
          {isProcessing ? "Processing..." : "Process Timetables"}
        </Button>
      </div>
    </div>
  )
}