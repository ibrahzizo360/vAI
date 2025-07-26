import connectDB from './connection'
import Patient from './models/Patient'
import ClinicalNote from './models/ClinicalNote'

export async function seedDatabase() {
  try {
    await connectDB()
    console.log('🌱 Starting database seeding...')

    // Clear existing data
    await Patient.deleteMany({})
    await ClinicalNote.deleteMany({})
    console.log('🗑️  Cleared existing data')

    // Seed neurosurgical patients
    const patients = await createNeurosurgicalPatients()
    console.log(`👥 Created ${patients.length} patients`)

    // Seed clinical notes for each patient
    let totalNotes = 0
    for (const patient of patients) {
      const notes = await createClinicalNotesForPatient(patient)
      totalNotes += notes.length
    }
    console.log(`📝 Created ${totalNotes} clinical notes`)

    console.log('✅ Database seeding completed successfully!')
    return { patients: patients.length, notes: totalNotes }

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }
}

async function createNeurosurgicalPatients() {
  const neurosurgicalDiagnoses = [
    'Glioblastoma multiforme',
    'Traumatic brain injury',
    'Subarachnoid hemorrhage',
    'Hydrocephalus',
    'Meningioma',
    'Subdural hematoma',
    'Brain aneurysm',
    'Spinal cord tumor',
    'Chiari malformation',
    'Arteriovenous malformation'
  ]

  const locations = ['ICU', 'Neurosurgery Ward', 'Step-down Unit', 'OR Recovery']
  const attendingPhysicians = ['Dr. Sarah Chen', 'Dr. Michael Rodriguez', 'Dr. Jennifer Kim', 'Dr. Robert Thompson']
  const residentPhysicians = ['Dr. Emily Davis', 'Dr. James Wilson', 'Dr. Maria Garcia', 'Dr. David Lee']

  const patientsData = []

  for (let i = 1; i <= 15; i++) {
    const admissionDate = new Date()
    admissionDate.setDate(admissionDate.getDate() - Math.floor(Math.random() * 30))
    
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - (25 + Math.floor(Math.random() * 50)))
    
    const firstName = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'][Math.floor(Math.random() * 10)]
    const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][Math.floor(Math.random() * 10)]
    
    const patientData = {
      mrn: `NSG${String(i).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      dob,
      age: new Date().getFullYear() - dob.getFullYear(),
      sex: Math.random() > 0.5 ? 'M' : 'F',
      
      primary_diagnosis: neurosurgicalDiagnoses[Math.floor(Math.random() * neurosurgicalDiagnoses.length)],
      secondary_diagnoses: [
        'Hypertension',
        'Diabetes mellitus type 2'
      ].slice(0, Math.floor(Math.random() * 3)),
      
      admission_date: admissionDate,
      admission_source: ['ER', 'Transfer', 'Elective'][Math.floor(Math.random() * 3)],
      
      gcs_admission: 8 + Math.floor(Math.random() * 8), // GCS 8-15
      current_location: locations[Math.floor(Math.random() * locations.length)],
      room_number: `${Math.floor(Math.random() * 5) + 3}${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`,
      attending_physician: attendingPhysicians[Math.floor(Math.random() * attendingPhysicians.length)],
      resident_physician: residentPhysicians[Math.floor(Math.random() * residentPhysicians.length)],
      
      procedures: i <= 10 ? [{
        name: ['Craniotomy', 'EVD placement', 'VP shunt', 'Tumor resection'][Math.floor(Math.random() * 4)],
        date: new Date(admissionDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        surgeon: attendingPhysicians[Math.floor(Math.random() * attendingPhysicians.length)],
        notes: 'Procedure completed without complications'
      }] : [],
      
      status: 'Active',
      
      monitoring: {
        icp_monitor: Math.random() > 0.6,
        evd: Math.random() > 0.7,
        ventilator: Math.random() > 0.8,
        other_devices: Math.random() > 0.5 ? ['Arterial line', 'Foley catheter'] : []
      },
      
      emergency_contacts: [{
        name: `${firstName === 'John' ? 'Mary' : 'John'} ${lastName}`,
        relationship: 'Spouse',
        phone: '555-' + String(Math.floor(Math.random() * 9000) + 1000),
        is_primary: true
      }],
      
      past_medical_history: [
        'Hypertension',
        'Hyperlipidemia'
      ].slice(0, Math.floor(Math.random() * 3)),
      
      allergies: Math.random() > 0.7 ? ['Penicillin'] : ['NKDA'],
      
      medications: [{
        name: 'Levetiracetam',
        dosage: '500mg',
        frequency: 'BID',
        route: 'PO',
        started_date: admissionDate
      }, {
        name: 'Dexamethasone',
        dosage: '4mg',
        frequency: 'Q6H',
        route: 'IV',
        started_date: admissionDate
      }]
    }
    
    patientsData.push(patientData)
  }

  return await Patient.insertMany(patientsData)
}

async function createClinicalNotesForPatient(patient: any) {
  const noteTypes = ['rounds', 'consult', 'family_meeting', 'procedure']
  const notes = []
  
  // Create 3-5 notes per patient over the last week
  const noteCount = 3 + Math.floor(Math.random() * 3)
  
  for (let i = 0; i < noteCount; i++) {
    const noteDate = new Date()
    noteDate.setDate(noteDate.getDate() - Math.floor(Math.random() * 7))
    
    const encounterType = noteTypes[Math.floor(Math.random() * noteTypes.length)]
    
    const noteData = {
      patient_id: patient._id,
      encounter_date: noteDate,
      encounter_time: `${8 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      encounter_type: encounterType,
      encounter_location: patient.current_location,
      duration_minutes: 15 + Math.floor(Math.random() * 30),
      
      template_id: getTemplateId(encounterType),
      template_name: getTemplateName(encounterType),
      
      note_sections: new Map(generateNoteSections(patient, encounterType)),
      
      audio_metadata: {
        duration_seconds: 300 + Math.floor(Math.random() * 600),
        transcription_provider: ['groq', 'assemblyai'][Math.floor(Math.random() * 2)],
        transcription_confidence: 0.85 + Math.random() * 0.1,
        speaker_count: encounterType === 'family_meeting' ? 3 + Math.floor(Math.random() * 3) : 2
      },
      
      extracted_content: generateExtractedContent(patient, encounterType),
      
      primary_provider: patient.resident_physician,
      attending_physician: patient.attending_physician,
      other_providers: encounterType === 'family_meeting' ? ['Social Worker', 'Chaplain'] : [],
      family_present: encounterType === 'family_meeting' ? ['Spouse', 'Daughter'] : [],
      
      status: ['draft', 'complete', 'signed'][Math.floor(Math.random() * 3)],
      
      tags: generateTags(patient, encounterType),
      urgency: Math.random() > 0.8 ? 'urgent' : 'routine',
      
      completeness_score: 70 + Math.floor(Math.random() * 30)
    }
    
    // Add signing information for signed notes
    if (noteData.status === 'signed') {
      noteData.signed_by = patient.attending_physician
      noteData.signed_at = new Date(noteDate.getTime() + 2 * 60 * 60 * 1000) // Signed 2 hours later
    }
    
    notes.push(noteData)
  }
  
  return await ClinicalNote.insertMany(notes)
}

function getTemplateId(encounterType: string): string {
  const templateMap = {
    'rounds': 'neuro_rounds',
    'consult': 'neuro_consult',
    'family_meeting': 'family_meeting',
    'procedure': 'neuro_procedure'
  }
  return templateMap[encounterType] || 'progress_note'
}

function getTemplateName(encounterType: string): string {
  const nameMap = {
    'rounds': 'Neurosurgery Rounds Note',
    'consult': 'Neurosurgery Consultation',
    'family_meeting': 'Family Meeting Note',
    'procedure': 'Procedure Note'
  }
  return nameMap[encounterType] || 'Progress Note'
}

function generateNoteSections(patient: any, encounterType: string): [string, string][] {
  const sections: [string, string][] = []
  
  if (encounterType === 'rounds') {
    sections.push(['subjective', `Patient is post-operative day ${Math.floor(Math.random() * 5) + 1} following ${patient.procedures[0]?.name || 'craniotomy'}. Reports headache ${Math.floor(Math.random() * 5) + 3}/10, improved from yesterday. No new neurological complaints. Family reports patient more alert and interactive.`])
    
    sections.push(['objective', `Vital signs stable. GCS ${patient.gcs_admission + Math.floor(Math.random() * 3)} (E${Math.floor(Math.random() * 2) + 3}V${Math.floor(Math.random() * 2) + 4}M6). Pupils equal, round, reactive to light bilaterally. Motor strength 5/5 all extremities. ${patient.monitoring.icp_monitor ? 'ICP readings 8-15 mmHg overnight.' : ''} Incision clean, dry, intact.`])
    
    sections.push(['assessment_plan', `${patient.primary_diagnosis}, stable post-operatively. Continue current neurological monitoring. Pain management with acetaminophen and tramadol PRN. Physical therapy evaluation. Plan for MRI brain with contrast in 48 hours to assess post-operative changes.`])
  } else if (encounterType === 'family_meeting') {
    sections.push(['attendees', 'Patient, spouse, daughter, Dr. ' + patient.attending_physician + ', social worker'])
    sections.push(['discussion_topics', 'Current medical status and prognosis\nTreatment options and next steps\nGoals of care and discharge planning'])
    sections.push(['decisions_made', 'Family agrees to continue current treatment plan\nDischarge planning to begin\nFollow-up appointments scheduled'])
  }
  
  return sections
}

function generateExtractedContent(patient: any, encounterType: string) {
  return {
    symptoms: ['headache', 'nausea', 'confusion'].slice(0, Math.floor(Math.random() * 3) + 1),
    vital_signs: {
      gcs: Math.min(15, patient.gcs_admission + Math.floor(Math.random() * 3)),
      blood_pressure: `${110 + Math.floor(Math.random() * 40)}/${70 + Math.floor(Math.random() * 20)}`,
      heart_rate: 60 + Math.floor(Math.random() * 40),
      temperature: 36.5 + Math.random() * 2,
      icp_reading: patient.monitoring.icp_monitor ? 8 + Math.floor(Math.random() * 10) : undefined
    },
    medications_mentioned: ['Levetiracetam', 'Dexamethasone'],
    procedures_mentioned: patient.procedures.map((p: any) => p.name),
    diagnoses_mentioned: [patient.primary_diagnosis],
    follow_up_items: [{
      item: 'MRI brain with contrast',
      priority: 'medium' as const,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assigned_to: 'Radiology'
    }]
  }
}

function generateTags(patient: any, encounterType: string): string[] {
  const baseTags = ['neurosurgery', patient.primary_diagnosis.toLowerCase().replace(/\s+/g, '-')]
  
  if (patient.monitoring.icp_monitor) baseTags.push('icp-monitoring')
  if (patient.monitoring.evd) baseTags.push('evd')
  if (encounterType === 'family_meeting') baseTags.push('family-conference')
  
  return baseTags
}