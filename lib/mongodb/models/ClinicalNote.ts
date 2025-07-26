import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IClinicalNote extends Document {
  _id: string
  patient_id: Types.ObjectId
  
  // Encounter information
  encounter_date: Date
  encounter_time: string
  encounter_type: 'rounds' | 'consult' | 'family_meeting' | 'procedure' | 'discharge' | 'emergency'
  encounter_location: string
  duration_minutes?: number
  
  // Note structure
  template_id: string
  template_name: string
  note_sections: {
    [sectionId: string]: string
  }
  
  // Audio/transcription metadata
  audio_metadata?: {
    original_filename?: string
    duration_seconds?: number
    file_size_bytes?: number
    transcription_provider: 'groq' | 'assemblyai' | 'litellm'
    transcription_confidence?: number
    speaker_count?: number
  }
  
  // Clinical content extraction
  extracted_content: {
    symptoms: string[]
    vital_signs: {
      gcs?: number
      blood_pressure?: string
      heart_rate?: number
      temperature?: number
      respiratory_rate?: number
      oxygen_saturation?: number
      icp_reading?: number
    }
    medications_mentioned: string[]
    procedures_mentioned: string[]
    diagnoses_mentioned: string[]
    follow_up_items: {
      item: string
      priority: 'high' | 'medium' | 'low'
      due_date?: Date
      assigned_to?: string
    }[]
  }
  
  // Providers and participants
  primary_provider: string
  attending_physician: string
  other_providers: string[]
  family_present: string[]
  
  // Documentation status
  status: 'draft' | 'review' | 'complete' | 'signed' | 'amended'
  reviewed_by?: string
  reviewed_at?: Date
  signed_by?: string
  signed_at?: Date
  
  // Legal and audit trail
  amendments: {
    amended_by: string
    amended_at: Date
    reason: string
    original_content: any
    new_content: any
  }[]
  
  // Classification and tags
  tags: string[]
  urgency: 'routine' | 'urgent' | 'emergent'
  
  // Quality and completeness
  completeness_score: number
  requires_followup: boolean
  
  // Export and sharing
  exported_formats: {
    format: string
    exported_at: Date
    exported_by: string
    file_reference?: string
  }[]
  
  created_at: Date
  updated_at: Date
}

const ClinicalNoteSchema = new Schema<IClinicalNote>({
  patient_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true,
    index: true 
  },
  
  encounter_date: { 
    type: Date, 
    required: true,
    index: true 
  },
  encounter_time: { 
    type: String, 
    required: true 
  },
  encounter_type: { 
    type: String, 
    enum: ['rounds', 'consult', 'family_meeting', 'procedure', 'discharge', 'emergency'], 
    required: true,
    index: true 
  },
  encounter_location: { 
    type: String, 
    required: true 
  },
  duration_minutes: Number,
  
  template_id: { 
    type: String, 
    required: true 
  },
  template_name: { 
    type: String, 
    required: true 
  },
  note_sections: { 
    type: Map, 
    of: String,
    required: true 
  },
  
  audio_metadata: {
    original_filename: String,
    duration_seconds: Number,
    file_size_bytes: Number,
    transcription_provider: { 
      type: String, 
      enum: ['groq', 'assemblyai', 'litellm'] 
    },
    transcription_confidence: Number,
    speaker_count: Number
  },
  
  extracted_content: {
    symptoms: [String],
    vital_signs: {
      gcs: { type: Number, min: 3, max: 15 },
      blood_pressure: String,
      heart_rate: Number,
      temperature: Number,
      respiratory_rate: Number,
      oxygen_saturation: Number,
      icp_reading: Number
    },
    medications_mentioned: [String],
    procedures_mentioned: [String],
    diagnoses_mentioned: [String],
    follow_up_items: [{
      item: { type: String, required: true },
      priority: { 
        type: String, 
        enum: ['high', 'medium', 'low'], 
        default: 'medium' 
      },
      due_date: Date,
      assigned_to: String,
      _id: false
    }]
  },
  
  primary_provider: { 
    type: String, 
    required: true,
    index: true 
  },
  attending_physician: { 
    type: String, 
    required: true 
  },
  other_providers: [String],
  family_present: [String],
  
  status: { 
    type: String, 
    enum: ['draft', 'review', 'complete', 'signed', 'amended'], 
    default: 'draft',
    index: true 
  },
  reviewed_by: String,
  reviewed_at: Date,
  signed_by: String,
  signed_at: Date,
  
  amendments: [{
    amended_by: { type: String, required: true },
    amended_at: { type: Date, required: true },
    reason: { type: String, required: true },
    original_content: Schema.Types.Mixed,
    new_content: Schema.Types.Mixed,
    _id: false
  }],
  
  tags: {
    type: [String],
    index: true
  },
  urgency: { 
    type: String, 
    enum: ['routine', 'urgent', 'emergent'], 
    default: 'routine' 
  },
  
  completeness_score: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0 
  },
  requires_followup: { 
    type: Boolean, 
    default: false 
  },
  
  exported_formats: [{
    format: { type: String, required: true },
    exported_at: { type: Date, required: true },
    exported_by: { type: String, required: true },
    file_reference: String,
    _id: false
  }],
  
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
ClinicalNoteSchema.index({ patient_id: 1, encounter_date: -1 })
ClinicalNoteSchema.index({ attending_physician: 1, encounter_date: -1 })
ClinicalNoteSchema.index({ encounter_type: 1, encounter_date: -1 })
ClinicalNoteSchema.index({ status: 1, created_at: -1 })
ClinicalNoteSchema.index({ tags: 1 })
ClinicalNoteSchema.index({ urgency: 1, requires_followup: 1 })

// Text search index for note content
ClinicalNoteSchema.index({
  'note_sections.subjective': 'text',
  'note_sections.objective': 'text',
  'note_sections.assessment_plan': 'text',
  'extracted_content.symptoms': 'text',
  'extracted_content.diagnoses_mentioned': 'text'
})

// Virtual for encounter display
ClinicalNoteSchema.virtual('encounter_display').get(function() {
  return `${this.encounter_type} - ${this.encounter_date.toLocaleDateString()} ${this.encounter_time}`
})

// Method to check if note is complete
ClinicalNoteSchema.methods.isComplete = function() {
  const requiredSections = ['subjective', 'objective', 'assessment_plan']
  return requiredSections.every(section => 
    this.note_sections.get(section) && this.note_sections.get(section).length > 10
  )
}

// Method to calculate completeness score
ClinicalNoteSchema.methods.calculateCompletenessScore = function() {
  let score = 0
  const maxScore = 100
  
  // Check required sections (60 points)
  const requiredSections = ['subjective', 'objective', 'assessment_plan']
  const completedRequired = requiredSections.filter(section => 
    this.note_sections.get(section) && this.note_sections.get(section).length > 10
  ).length
  score += (completedRequired / requiredSections.length) * 60
  
  // Check vital signs documented (20 points)
  const vitalSigns = this.extracted_content.vital_signs
  const documentedVitals = Object.values(vitalSigns).filter(v => v != null).length
  score += (documentedVitals / 7) * 20
  
  // Check follow-up items (10 points)
  if (this.extracted_content.follow_up_items.length > 0) {
    score += 10
  }
  
  // Check if signed (10 points)
  if (this.status === 'signed') {
    score += 10
  }
  
  return Math.round(score)
}

// Method to add amendment
ClinicalNoteSchema.methods.addAmendment = function(amendedBy: string, reason: string, changes: any) {
  this.amendments.push({
    amended_by: amendedBy,
    amended_at: new Date(),
    reason,
    original_content: this.note_sections.toObject(),
    new_content: changes
  })
  
  // Update the note sections
  Object.keys(changes).forEach(key => {
    this.note_sections.set(key, changes[key])
  })
  
  this.status = 'amended'
}

// Pre-save middleware to update completeness score
ClinicalNoteSchema.pre('save', function(next) {
  this.completeness_score = this.calculateCompletenessScore()
  
  // Check if follow-up is required
  this.requires_followup = this.extracted_content.follow_up_items.some(
    (item: any) => item.priority === 'high'
  )
  
  next()
})

export default mongoose.models.ClinicalNote || mongoose.model<IClinicalNote>('ClinicalNote', ClinicalNoteSchema)