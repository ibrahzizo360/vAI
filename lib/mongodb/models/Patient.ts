import mongoose, { Schema, Document } from 'mongoose'

export interface IPatient extends Document {
  _id: string
  mrn: string
  name: string
  dob: Date
  age: number
  sex: 'M' | 'F' | 'Other'
  
  // Neurosurgical specific fields
  primary_diagnosis: string
  secondary_diagnoses: string[]
  admission_date: Date
  admission_source: 'ER' | 'Transfer' | 'Elective' | 'ICU'
  
  // Clinical details
  gcs_admission: number
  current_location: string
  room_number?: string
  attending_physician: string
  resident_physician?: string
  
  // Neurosurgical procedures
  procedures: {
    name: string
    date: Date
    surgeon: string
    notes?: string
  }[]
  
  // Current status
  status: 'Active' | 'Discharged' | 'Transferred' | 'Deceased'
  discharge_date?: Date
  
  // Monitoring devices
  monitoring: {
    icp_monitor: boolean
    evd: boolean
    ventilator: boolean
    other_devices: string[]
  }
  
  // Family/emergency contacts
  emergency_contacts: {
    name: string
    relationship: string
    phone: string
    is_primary: boolean
  }[]
  
  // Medical history
  past_medical_history: string[]
  allergies: string[]
  medications: {
    name: string
    dosage: string
    frequency: string
    route: string
    started_date: Date
    discontinued_date?: Date
  }[]
  
  created_at: Date
  updated_at: Date
}

const PatientSchema = new Schema<IPatient>({
  mrn: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  dob: { 
    type: Date, 
    required: true 
  },
  age: { 
    type: Number, 
    required: true 
  },
  sex: { 
    type: String, 
    enum: ['M', 'F', 'Other'], 
    required: true 
  },
  
  primary_diagnosis: { 
    type: String, 
    required: true,
    index: true 
  },
  secondary_diagnoses: [{ 
    type: String 
  }],
  admission_date: { 
    type: Date, 
    required: true,
    index: true 
  },
  admission_source: { 
    type: String, 
    enum: ['ER', 'Transfer', 'Elective', 'ICU'], 
    required: true 
  },
  
  gcs_admission: { 
    type: Number, 
    min: 3, 
    max: 15 
  },
  current_location: { 
    type: String, 
    required: true 
  },
  room_number: String,
  attending_physician: { 
    type: String, 
    required: true 
  },
  resident_physician: String,
  
  procedures: [{
    name: { type: String, required: true },
    date: { type: Date, required: true },
    surgeon: { type: String, required: true },
    notes: String,
    _id: false
  }],
  
  status: { 
    type: String, 
    enum: ['Active', 'Discharged', 'Transferred', 'Deceased'], 
    default: 'Active',
    index: true 
  },
  discharge_date: Date,
  
  monitoring: {
    icp_monitor: { type: Boolean, default: false },
    evd: { type: Boolean, default: false },
    ventilator: { type: Boolean, default: false },
    other_devices: [String]
  },
  
  emergency_contacts: [{
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    is_primary: { type: Boolean, default: false },
    _id: false
  }],
  
  past_medical_history: [String],
  allergies: [String],
  
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    route: { type: String, required: true },
    started_date: { type: Date, required: true },
    discontinued_date: Date,
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

// Indexes for efficient querying
PatientSchema.index({ mrn: 1 })
PatientSchema.index({ name: 1 })
PatientSchema.index({ attending_physician: 1 })
PatientSchema.index({ admission_date: -1 })
PatientSchema.index({ primary_diagnosis: 1 })
PatientSchema.index({ status: 1 })
PatientSchema.index({ current_location: 1 })

// Virtual for full name display
PatientSchema.virtual('display_name').get(function() {
  return `${this.name} (${this.mrn})`
})

// Method to calculate current age
PatientSchema.methods.getCurrentAge = function() {
  const today = new Date()
  const birthDate = new Date(this.dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Method to get active medications
PatientSchema.methods.getActiveMedications = function() {
  return this.medications.filter((med: any) => !med.discontinued_date)
}

// Pre-save middleware to update age
PatientSchema.pre('save', function(next) {
  if (this.dob) {
    this.age = this.getCurrentAge()
  }
  next()
})

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema)