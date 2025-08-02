"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { uploadImageToCloudinary, generatePatientMediaFolder, getThumbnailUrl } from "@/lib/cloudinary/config"
import { Upload, X, Image as ImageIcon, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadProps {
  patientId: string
  clinicalNoteId?: string
  onUploadComplete?: (mediaData: any) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

interface UploadedImage {
  file: File
  preview: string
  cloudinaryData?: any
  metadata: {
    mediaType: string
    description: string
    bodyRegion: string
    clinicalIndication: string
    tags: string[]
  }
  uploading: boolean
  uploaded: boolean
}

const mediaTypeOptions = [
  { value: 'clinical_photo', label: 'Clinical Photo' },
  { value: 'wound_photo', label: 'Wound Documentation' },
  { value: 'procedure_photo', label: 'Procedure Documentation' },
  { value: 'imaging_study', label: 'Imaging Study' },
  { value: 'xray', label: 'X-Ray' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'mri', label: 'MRI' },
  { value: 'document', label: 'Document/Report' }
]

const bodyRegionOptions = [
  'Head/Skull', 'Brain', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar', 
  'Face', 'Neck', 'Other', 'Full Body', 'Surgical Site'
]

export function ImageUpload({ 
  patientId, 
  clinicalNoteId, 
  onUploadComplete, 
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList) => {
    const newImages: UploadedImage[] = []
    
    Array.from(files).forEach((file) => {
      if (images.length + newImages.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`)
        return
      }
      
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`File type ${file.type} not supported`)
        return
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`File ${file.name} is too large. Maximum 10MB allowed.`)
        return
      }

      const preview = URL.createObjectURL(file)
      newImages.push({
        file,
        preview,
        metadata: {
          mediaType: 'clinical_photo',
          description: '',
          bodyRegion: '',
          clinicalIndication: '',
          tags: []
        },
        uploading: false,
        uploaded: false
      })
    })

    setImages(prev => [...prev, ...newImages])
  }

  const updateImageMetadata = (index: number, field: string, value: any) => {
    setImages(prev => prev.map((img, i) => 
      i === index 
        ? { ...img, metadata: { ...img.metadata, [field]: value } }
        : img
    ))
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const uploadSingleImage = async (image: UploadedImage, index: number) => {
    try {
      // Mark as uploading
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, uploading: true } : img
      ))

      const folder = generatePatientMediaFolder(patientId, image.metadata.mediaType)
      const context = {
        patient_id: patientId,
        media_type: image.metadata.mediaType,
        ...(clinicalNoteId && { clinical_note_id: clinicalNoteId }),
        uploaded_at: new Date().toISOString()
      }

      const cloudinaryResult = await uploadImageToCloudinary(image.file, folder, context)

      // Save to database
      const response = await fetch('/api/patient-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          clinical_note_id: clinicalNoteId,
          cloudinary_public_id: cloudinaryResult.public_id,
          cloudinary_url: cloudinaryResult.url,
          cloudinary_secure_url: cloudinaryResult.secure_url,
          thumbnail_url: getThumbnailUrl(cloudinaryResult.public_id),
          original_filename: image.file.name,
          file_type: image.file.type.startsWith('image/') ? 'image' : 'document',
          mime_type: image.file.type,
          file_size_bytes: cloudinaryResult.bytes,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          media_type: image.metadata.mediaType,
          body_region: image.metadata.bodyRegion,
          clinical_indication: image.metadata.clinicalIndication,
          description: image.metadata.description,
          tags: image.metadata.tags,
          captured_date: new Date().toISOString(),
          uploaded_by: 'current_user' // This should come from your auth system
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save media record')
      }

      const savedMedia = await response.json()

      // Mark as uploaded
      setImages(prev => prev.map((img, i) => 
        i === index 
          ? { ...img, uploading: false, uploaded: true, cloudinaryData: cloudinaryResult }
          : img
      ))

      if (onUploadComplete) {
        onUploadComplete(savedMedia)
      }

      toast.success(`${image.file.name} uploaded successfully`)

    } catch (error) {
      console.error('Upload error:', error)
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, uploading: false } : img
      ))
      toast.error(`Failed to upload ${image.file.name}`)
    }
  }

  const uploadAllImages = async () => {
    setIsUploading(true)
    
    const unuploadedImages = images.filter(img => !img.uploaded && !img.uploading)
    
    for (let i = 0; i < images.length; i++) {
      if (!images[i].uploaded && !images[i].uploading) {
        await uploadSingleImage(images[i], i)
      }
    }
    
    setIsUploading(false)
  }

  const allUploaded = images.length > 0 && images.every(img => img.uploaded)
  const hasUnuploaded = images.some(img => !img.uploaded && !img.uploading)

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
        <CardContent className="p-6">
          <div
            className="text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault()
              const files = e.dataTransfer.files
              if (files.length > 0) {
                handleFileSelect(files)
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Upload Patient Images
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-gray-400">
              Supports: JPEG, PNG, WebP, PDF • Max {maxFiles} files • 10MB per file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Preview and Metadata */}
      {images.map((image, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Image Preview */}
              <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {image.file.type.startsWith('image/') ? (
                  <img
                    src={image.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                {/* Status Overlay */}
                <div className="absolute top-2 right-2">
                  {image.uploading && (
                    <div className="bg-blue-500 rounded-full p-1">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                  )}
                  {image.uploaded && (
                    <div className="bg-green-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
                  disabled={image.uploading}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Metadata Form */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{image.file.name}</h4>
                  <Badge variant={image.uploaded ? 'default' : 'secondary'}>
                    {image.uploaded ? 'Uploaded' : image.uploading ? 'Uploading...' : 'Pending'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Media Type</label>
                    <Select
                      value={image.metadata.mediaType}
                      onValueChange={(value) => updateImageMetadata(index, 'mediaType', value)}
                      disabled={image.uploading || image.uploaded}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mediaTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Body Region</label>
                    <Select
                      value={image.metadata.bodyRegion}
                      onValueChange={(value) => updateImageMetadata(index, 'bodyRegion', value)}
                      disabled={image.uploading || image.uploaded}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyRegionOptions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Description</label>
                  <Input
                    value={image.metadata.description}
                    onChange={(e) => updateImageMetadata(index, 'description', e.target.value)}
                    placeholder="Brief description of the image..."
                    className="h-8"
                    disabled={image.uploading || image.uploaded}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Clinical Indication</label>
                  <Input
                    value={image.metadata.clinicalIndication}
                    onChange={(e) => updateImageMetadata(index, 'clinicalIndication', e.target.value)}
                    placeholder="Why was this image taken?"
                    className="h-8"
                    disabled={image.uploading || image.uploaded}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Upload Actions */}
      {images.length > 0 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-600">
            {images.filter(img => img.uploaded).length} of {images.length} files uploaded
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setImages([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
            
            {hasUnuploaded && (
              <Button
                onClick={uploadAllImages}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}