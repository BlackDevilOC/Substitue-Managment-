import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import { useState } from "react"

export default function FileUploadPage() {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (type: 'timetable' | 'substitute', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Failed to upload ${type} file`)
      }
      
      // File uploaded successfully
      console.log(`${type} file uploaded successfully`)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
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
      </div>
    </div>
  )
}
