import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IPatientMedia extends Document {
  _id: string
  patient_id: Types.ObjectId
  clinical_note_id?: Types.ObjectId
  
  // Cloudinary information
  cloudinary_public_id: string
  cloudinary_url: string
  cloudinary_secure_url: string
  thumbnail_url?: string
  
  // File information
  original_filename: string
  file_type: 'image' | 'document' | 'video'
  mime_type: string
  file_size_bytes: number
  width?: number
  height?: number
  
  // Medical context
  media_type: 'clinical_photo' | 'imaging_study' | 'wound_photo' | 'procedure_photo' | 'document' | 'xray' | 'ct_scan' | 'mri'
  body_region?: string
  clinical_indication?: string
  procedure_context?: string
  
  // Metadata
  captured_date: Date
  uploaded_by: string
  tags: string[]
  description?: string
  
  // Access control
  visibility: 'team' | 'restricted'
  requires_consent: boolean
  
  created_at: Date
  updated_at: Date
}

const PatientMediaSchema = new Schema<IPatientMedia>({
  patient_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true 
  },
  clinical_note_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'ClinicalNote',
    index: true 
  },
  
  // Cloudinary fields
  cloudinary_public_id: { 
    type: String, 
    required: true,
    unique: true 
  },
  cloudinary_url: { 
    type: String, 
    required: true 
  },
  cloudinary_secure_url: { 
    type: String, 
    required: true 
  },
  thumbnail_url: String,
  
  // File info
  original_filename: { 
    type: String, 
    required: true 
  },
  file_type: { 
    type: String, 
    enum: ['image', 'document', 'video'], 
    required: true 
  },
  mime_type: { 
    type: String, 
    required: true 
  },
  file_size_bytes: { 
    type: Number, 
    required: true 
  },
  width: Number,
  height: Number,
  
  // Medical context
  media_type: { 
    type: String, 
    enum: ['clinical_photo', 'imaging_study', 'wound_photo', 'procedure_photo', 'document', 'xray', 'ct_scan', 'mri'], 
    required: true,
    index: true 
  },
  body_region: String,
  clinical_indication: String,
  procedure_context: String,
  
  // Metadata
  captured_date: { 
    type: Date, 
    required: true,
    index: true 
  },
  uploaded_by: { 
    type: String, 
    required: true 
  },
  tags: {
    type: [String],
    index: true
  },
  description: String,
  
  // Access control
  visibility: { 
    type: String, 
    enum: ['team', 'restricted'], 
    default: 'team' 
  },
  requires_consent: { 
    type: Boolean, 
    default: true 
  },
  
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
})

// Compound indexes for efficient queries
PatientMediaSchema.index({ patient_id: 1, captured_date: -1 })
PatientMediaSchema.index({ patient_id: 1, media_type: 1 })
PatientMediaSchema.index({ clinical_note_id: 1, file_type: 1 })
PatientMediaSchema.index({ uploaded_by: 1, created_at: -1 })

// Text search index
PatientMediaSchema.index({
  description: 'text',
  tags: 'text',
  clinical_indication: 'text'
})

// Virtual for file size in human readable format
PatientMediaSchema.virtual('file_size_formatted').get(function() {
  const bytes = this.file_size_bytes
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
})

// Method to get optimized image URL
PatientMediaSchema.methods.getOptimizedUrl = function(width?: number, height?: number, quality?: string) {
  const baseUrl = this.cloudinary_secure_url
  if (!width && !height && !quality) return baseUrl
  
  let transformation = []
  if (width || height) {
    transformation.push(`c_limit,w_${width || 'auto'},h_${height || 'auto'}`)
  }
  if (quality) {
    transformation.push(`q_${quality}`)
  }
  
  return baseUrl.replace('/upload/', `/upload/${transformation.join(',')}/`)
}

// Method to get thumbnail URL
PatientMediaSchema.methods.getThumbnailUrl = function() {
  return this.thumbnail_url || this.getOptimizedUrl(200, 200, 'auto')
}

export default mongoose.models.PatientMedia || mongoose.model<IPatientMedia>('PatientMedia', PatientMediaSchema)