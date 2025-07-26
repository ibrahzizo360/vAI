import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon, Video, FileText } from "lucide-react"

interface MediaUploadCardProps {
  title: string
  type: "image" | "video" | "text"
}

export function MediaUploadCard({ title, type }: MediaUploadCardProps) {
  const Icon = type === "image" ? ImageIcon : type === "video" ? Video : FileText
  const fileType = type === "image" ? "image/*" : type === "video" ? "video/*" : "text/plain, .pdf, .doc, .docx"

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 md:p-6 text-center w-full hover:border-primary/50 transition-colors">
          <Icon className="h-8 w-8 md:h-10 md:w-10 text-gray-400 mx-auto mb-2 md:mb-3" />
          <p className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3">
            Drag & drop {type} here, or click to upload
          </p>
          <input type="file" accept={fileType} className="hidden" id={`upload-${type}-${title.replace(/\s+/g, '-').toLowerCase()}`} />
          <label htmlFor={`upload-${type}-${title.replace(/\s+/g, '-').toLowerCase()}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary hover:bg-primary hover:text-white transition-colors duration-200 bg-transparent text-xs md:text-sm"
              aria-label={`Upload ${title}`}
            >
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Browse Files
            </Button>
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
