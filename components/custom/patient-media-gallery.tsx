"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUpload } from "./image-upload"
import { Image as ImageIcon, Calendar, User, FileText, Plus, Eye, Download, Loader2 } from "lucide-react"
import { getOptimizedImageUrl, getThumbnailUrl } from "@/lib/cloudinary/config"
import { toast } from "sonner"

interface MediaItem {
  _id: string
  cloudinary_public_id: string
  cloudinary_secure_url: string
  thumbnail_url: string
  original_filename: string
  file_type: string
  mime_type: string
  file_size_bytes: number
  width?: number
  height?: number
  media_type: string
  body_region?: string
  clinical_indication?: string
  description?: string
  tags: string[]
  captured_date: string
  uploaded_by: string
  patient_id: {
    _id: string
    name: string
    mrn: string
  }
  clinical_note_id?: {
    _id: string
    encounter_date: string
    encounter_type: string
  }
}

interface PatientMediaGalleryProps {
  patientId: string
  clinicalNoteId?: string
  showUpload?: boolean
  maxHeight?: string
}

export function PatientMediaGallery({ 
  patientId, 
  clinicalNoteId, 
  showUpload = true,
  maxHeight = "600px"
}: PatientMediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("gallery")

  useEffect(() => {
    fetchMedia()
  }, [patientId, clinicalNoteId])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        patient_id: patientId,
        ...(clinicalNoteId && { clinical_note_id: clinicalNoteId })
      })
      
      const response = await fetch(`/api/patient-media?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMedia(data.media)
      } else {
        toast.error('Failed to load media')
      }
    } catch (error) {
      console.error('Error fetching media:', error)
      toast.error('Error loading media')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (newMedia: any) => {
    setMedia(prev => [newMedia.media, ...prev])
    toast.success('Image uploaded successfully')
  }

  const getMediaTypeColor = (mediaType: string) => {
    const colors = {
      'clinical_photo': 'bg-blue-100 text-blue-800',
      'wound_photo': 'bg-red-100 text-red-800',
      'procedure_photo': 'bg-green-100 text-green-800',
      'imaging_study': 'bg-purple-100 text-purple-800',
      'xray': 'bg-gray-100 text-gray-800',
      'ct_scan': 'bg-indigo-100 text-indigo-800',
      'mri': 'bg-pink-100 text-pink-800',
      'document': 'bg-yellow-100 text-yellow-800'
    }
    return colors[mediaType as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatMediaType = (mediaType: string) => {
    const formatted = {
      'clinical_photo': 'Clinical Photo',
      'wound_photo': 'Wound Documentation',
      'procedure_photo': 'Procedure Photo',
      'imaging_study': 'Imaging Study',
      'xray': 'X-Ray',
      'ct_scan': 'CT Scan',
      'mri': 'MRI',
      'document': 'Document'
    }
    return formatted[mediaType as keyof typeof formatted] || mediaType
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const downloadImage = (mediaItem: MediaItem) => {
    const link = document.createElement('a')
    link.href = mediaItem.cloudinary_secure_url
    link.download = mediaItem.original_filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Group media by type
  const groupedMedia = media.reduce((groups, item) => {
    const type = item.media_type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(item)
    return groups
  }, {} as Record<string, MediaItem[]>)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading media...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Patient Media ({media.length})
            </CardTitle>
            {showUpload && (
              <Button
                onClick={() => setShowUploadDialog(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent style={{ maxHeight, overflowY: 'auto' }}>
          {media.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No media files uploaded yet</p>
              {showUpload && (
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload First Image
                </Button>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="gallery">Gallery View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>

              <TabsContent value="gallery">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((item) => (
                    <div
                      key={item._id}
                      className="relative group cursor-pointer bg-gray-100 rounded-lg overflow-hidden aspect-square"
                      onClick={() => setSelectedImage(item)}
                    >
                      {item.file_type === 'image' ? (
                        <img
                          src={item.thumbnail_url || getThumbnailUrl(item.cloudinary_public_id)}
                          alt={item.description || item.original_filename}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {/* Media Type Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`text-xs ${getMediaTypeColor(item.media_type)}`}>
                          {formatMediaType(item.media_type)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list">
                <div className="space-y-3">
                  {Object.entries(groupedMedia).map(([mediaType, items]) => (
                    <div key={mediaType} className="space-y-2">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Badge className={getMediaTypeColor(mediaType)}>
                          {formatMediaType(mediaType)}
                        </Badge>
                        <span className="text-sm text-gray-500">({items.length})</span>
                      </h4>
                      
                      {items.map((item) => (
                        <Card key={item._id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                {item.file_type === 'image' ? (
                                  <img
                                    src={item.thumbnail_url || getThumbnailUrl(item.cloudinary_public_id)}
                                    alt={item.description || item.original_filename}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 truncate">
                                  {item.description || item.original_filename}
                                </h5>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(item.captured_date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{item.uploaded_by}</span>
                                  </div>
                                  <span>{formatFileSize(item.file_size_bytes)}</span>
                                </div>
                                {item.body_region && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Region: {item.body_region}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedImage(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadImage(item)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedImage.description || selectedImage.original_filename}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadImage(selectedImage)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Image Display */}
              {selectedImage.file_type === 'image' && (
                <div className="flex justify-center">
                  <img
                    src={getOptimizedImageUrl(selectedImage.cloudinary_public_id, 800, 600)}
                    alt={selectedImage.description || selectedImage.original_filename}
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}
              
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">File Information</h4>
                  <div className="space-y-1 text-gray-600">
                    <p><span className="font-medium">Type:</span> {formatMediaType(selectedImage.media_type)}</p>
                    <p><span className="font-medium">Size:</span> {formatFileSize(selectedImage.file_size_bytes)}</p>
                    {selectedImage.width && selectedImage.height && (
                      <p><span className="font-medium">Dimensions:</span> {selectedImage.width} × {selectedImage.height}</p>
                    )}
                    <p><span className="font-medium">Format:</span> {selectedImage.mime_type}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Clinical Information</h4>
                  <div className="space-y-1 text-gray-600">
                    <p><span className="font-medium">Captured:</span> {new Date(selectedImage.captured_date).toLocaleString()}</p>
                    <p><span className="font-medium">Uploaded by:</span> {selectedImage.uploaded_by}</p>
                    {selectedImage.body_region && (
                      <p><span className="font-medium">Body Region:</span> {selectedImage.body_region}</p>
                    )}
                    {selectedImage.clinical_indication && (
                      <p><span className="font-medium">Indication:</span> {selectedImage.clinical_indication}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedImage.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedImage.description}</p>
                </div>
              )}
              
              {selectedImage.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImage.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      {showUploadDialog && (
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Patient Images</DialogTitle>
            </DialogHeader>
            <ImageUpload
              patientId={patientId}
              clinicalNoteId={clinicalNoteId}
              onUploadComplete={handleUploadComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}