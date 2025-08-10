"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  notes: any[]
  title?: string
}

export function ExportModal({ isOpen, onClose, notes, title = "Export Notes" }: ExportModalProps) {
  const [format, setFormat] = useState("pdf")
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const formatOptions = [
    { value: "pdf", label: "PDF Document", description: "HTML format ready for PDF conversion (Ctrl+P to save as PDF)" },
    { value: "text", label: "Plain Text", description: "Simple text format" },
    { value: "rtf", label: "Rich Text Format", description: "Compatible with word processors" }
  ]

  const handleExport = async () => {
    if (notes.length === 0) return

    setIsExporting(true)
    const loadingToast = toast.loading('Preparing export...', {
      description: `Exporting ${notes.length} note(s) as ${format.toUpperCase()}`
    })

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes,
          export_options: {
            format,
            include_metadata: includeMetadata,
            include_timestamps: includeTimestamps,
            patient_identifiers: true,
            bundle_format: notes.length > 1 ? 'zip' : undefined
          }
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Create download link
        const content = result.content
        const mimeType = result.export_info.mime_type
        const filename = result.export_info.filename
        
        // Convert base64 to blob and download
        const binaryString = atob(content)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], { type: mimeType })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.dismiss(loadingToast)
        toast.success('Export completed!', {
          description: `${notes.length} note(s) exported as ${filename}`
        })
        
        onClose()
      } else {
        const errorData = await response.json()
        toast.dismiss(loadingToast)
        toast.error('Export failed', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.dismiss(loadingToast)
      toast.error('Export error', {
        description: 'Failed to export notes. Please try again.'
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Export {notes.length} clinical note{notes.length !== 1 ? 's' : ''} in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Export Options</label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={setIncludeMetadata}
              />
              <label htmlFor="metadata" className="text-sm">
                Include metadata (creation date, provider info)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="timestamps"
                checked={includeTimestamps}
                onCheckedChange={setIncludeTimestamps}
              />
              <label htmlFor="timestamps" className="text-sm">
                Include encounter timestamps
              </label>
            </div>
          </div>

          {notes.length > 1 && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                Multiple notes will be bundled into a ZIP file containing individual {format.toUpperCase()} files.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || notes.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {notes.length} Note{notes.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}