export interface MedicalNoteTemplate {
  id: string
  name: string
  description: string
  sections: MedicalNoteSection[]
  specialty?: string
  context: string[]
}

export interface MedicalNoteSection {
  id: string
  title: string
  required: boolean
  placeholder: string
  type: 'text' | 'list' | 'structured' | 'vital_signs' | 'assessment_plan'
  examples?: string[]
}

export interface GeneratedMedicalNote {
  template_id: string
  template_name: string
  patient: PatientInfo
  encounter: EncounterInfo
  sections: { [sectionId: string]: string }
  created_at: string
  last_modified: string
  status: 'draft' | 'complete' | 'signed'
}

export interface PatientInfo {
  id?: string
  name?: string
  mrn?: string
  age?: number
  dob?: string
  sex?: string
}

export interface EncounterInfo {
  date: string
  time: string
  type: 'rounds' | 'consult' | 'family_meeting' | 'procedure' | 'discharge'
  location: string
  duration_minutes?: number
  providers: string[]
}

// Neurosurgery Clinical Templates
export const NEUROSURGERY_TEMPLATES: MedicalNoteTemplate[] = [
  {
    id: 'neuro_rounds',
    name: 'Neurosurgery Rounds Note',
    description: 'Daily rounds documentation for neurosurgical patients',
    specialty: 'neurosurgery',
    context: ['rounds', 'daily_assessment', 'icu', 'ward'],
    sections: [
      {
        id: 'subjective',
        title: 'Subjective',
        required: true,
        type: 'text',
        placeholder: 'Patient complaints, symptoms, pain level, neurological symptoms',
        examples: [
          'Patient reports headache 7/10, improved from yesterday',
          'No new neurological complaints, alert and oriented x3',
          'Family reports patient more confused this morning'
        ]
      },
      {
        id: 'objective',
        title: 'Objective',
        required: true,
        type: 'structured',
        placeholder: 'Vital signs, neurological exam, GCS, imaging findings',
        examples: [
          'GCS 15 (E4V5M6), pupils equal and reactive',
          'ICP readings 8-12 mmHg overnight',
          'CT head shows stable post-op changes'
        ]
      },
      {
        id: 'neuro_exam',
        title: 'Neurological Examination',
        required: true,
        type: 'structured',
        placeholder: 'Mental status, cranial nerves, motor, sensory, reflexes, coordination',
        examples: [
          'Alert, oriented x3. CNs II-XII intact. Motor 5/5 all extremities',
          'Mild right-sided weakness 4/5, otherwise neurologically intact',
          'GCS 13 (E3V4M6), follows commands appropriately'
        ]
      },
      {
        id: 'assessment_plan',
        title: 'Assessment & Plan',
        required: true,
        type: 'assessment_plan',
        placeholder: 'Primary diagnosis, differential, treatment plan, monitoring',
        examples: [
          'Post-op day 2 s/p craniotomy for tumor resection. Stable.',
          'Traumatic brain injury with ICP monitoring. Continue current management.',
          'Hydrocephalus with EVD in place. Consider VP shunt placement.'
        ]
      }
    ]
  },
  {
    id: 'neuro_consult',
    name: 'Neurosurgery Consultation',
    description: 'New consultation note template',
    specialty: 'neurosurgery',
    context: ['consultation', 'new_patient', 'referral'],
    sections: [
      {
        id: 'chief_complaint',
        title: 'Chief Complaint',
        required: true,
        type: 'text',
        placeholder: 'Brief statement of primary concern',
        examples: [
          'Severe headache and vomiting x 3 days',
          'Progressive weakness in left arm',
          'Consult for brain mass found on imaging'
        ]
      },
      {
        id: 'hpi',
        title: 'History of Present Illness',
        required: true,
        type: 'text',
        placeholder: 'Detailed chronological account of current illness',
        examples: [
          'Patient developed sudden onset worst headache of life...',
          'Progressive neurological decline over 2 weeks...',
          'Incidental finding on MRI for headaches...'
        ]
      },
      {
        id: 'physical_exam',
        title: 'Physical Examination',
        required: true,
        type: 'structured',
        placeholder: 'General appearance, vital signs, neurological examination',
      },
      {
        id: 'imaging',
        title: 'Imaging/Studies',
        required: false,
        type: 'list',
        placeholder: 'CT, MRI, angiography, other relevant studies',
        examples: [
          'CT head: 4cm right frontal mass with surrounding edema',
          'MRI brain with contrast: enhancing lesion suspicious for glioma',
          'CTA head/neck: no aneurysm or vascular malformation'
        ]
      },
      {
        id: 'impression_plan',
        title: 'Impression & Plan',
        required: true,
        type: 'assessment_plan',
        placeholder: 'Clinical impression and detailed management plan',
      }
    ]
  },
  {
    id: 'family_meeting',
    name: 'Family Meeting Note',
    description: 'Documentation for family conferences and goals of care discussions',
    specialty: 'general',
    context: ['family_meeting', 'goals_of_care', 'prognosis_discussion'],
    sections: [
      {
        id: 'attendees',
        title: 'Meeting Attendees',
        required: true,
        type: 'list',
        placeholder: 'List all attendees: family members, medical team, etc.',
        examples: [
          'Patient, spouse, daughter, Dr. Smith (attending), RN Jones',
          'Mother, father, social worker, chaplain, ICU team'
        ]
      },
      {
        id: 'discussion_topics',
        title: 'Topics Discussed',
        required: true,
        type: 'list',
        placeholder: 'Key discussion points, questions addressed',
        examples: [
          'Current medical status and prognosis',
          'Treatment options and risks/benefits',
          'Goals of care and patient preferences'
        ]
      },
      {
        id: 'family_concerns',
        title: 'Family Questions/Concerns',
        required: false,
        type: 'text',
        placeholder: 'Specific questions or concerns raised by family',
      },
      {
        id: 'decisions_made',
        title: 'Decisions/Plans',
        required: true,
        type: 'list',
        placeholder: 'Decisions made, next steps, follow-up plans',
        examples: [
          'Family agrees to proceed with surgery',
          'Transition to comfort care measures',
          'Continue current treatment, reassess in 48 hours'
        ]
      }
    ]
  }
]

export const GENERAL_TEMPLATES: MedicalNoteTemplate[] = [
  {
    id: 'progress_note',
    name: 'Progress Note',
    description: 'General progress note template',
    context: ['daily_note', 'follow_up', 'ward_rounds'],
    sections: [
      {
        id: 'subjective',
        title: 'Subjective',
        required: true,
        type: 'text',
        placeholder: 'Patient-reported symptoms, concerns, changes since last visit'
      },
      {
        id: 'objective',
        title: 'Objective',
        required: true,
        type: 'structured',
        placeholder: 'Vital signs, physical exam findings, laboratory results'
      },
      {
        id: 'assessment_plan',
        title: 'Assessment & Plan',
        required: true,
        type: 'assessment_plan',
        placeholder: 'Clinical assessment and management plan by problem'
      }
    ]
  },
  {
    id: 'discharge_summary',
    name: 'Discharge Summary',
    description: 'Hospital discharge documentation',
    context: ['discharge', 'transfer', 'summary'],
    sections: [
      {
        id: 'admission_diagnosis',
        title: 'Admission Diagnosis',
        required: true,
        type: 'text',
        placeholder: 'Primary reason for admission'
      },
      {
        id: 'discharge_diagnosis',
        title: 'Discharge Diagnosis',
        required: true,
        type: 'list',
        placeholder: 'Final diagnoses at discharge'
      },
      {
        id: 'hospital_course',
        title: 'Hospital Course',
        required: true,
        type: 'text',
        placeholder: 'Summary of hospital stay, treatments, procedures'
      },
      {
        id: 'discharge_instructions',
        title: 'Discharge Instructions',
        required: true,
        type: 'list',
        placeholder: 'Medications, activity restrictions, follow-up appointments'
      }
    ]
  }
]

export class MedicalNoteTemplateService {
  static getAllTemplates(): MedicalNoteTemplate[] {
    return [...NEUROSURGERY_TEMPLATES, ...GENERAL_TEMPLATES]
  }

  static getTemplateById(id: string): MedicalNoteTemplate | undefined {
    return this.getAllTemplates().find(template => template.id === id)
  }

  static getTemplatesByContext(context: string): MedicalNoteTemplate[] {
    return this.getAllTemplates().filter(template => 
      template.context.includes(context)
    )
  }

  static getTemplatesBySpecialty(specialty: string): MedicalNoteTemplate[] {
    return this.getAllTemplates().filter(template => 
      template.specialty === specialty || !template.specialty
    )
  }

  static createEmptyNote(templateId: string, patient?: PatientInfo, encounter?: EncounterInfo): GeneratedMedicalNote | null {
    const template = this.getTemplateById(templateId)
    if (!template) return null

    const sections: { [sectionId: string]: string } = {}
    template.sections.forEach(section => {
      sections[section.id] = ''
    })

    return {
      template_id: templateId,
      template_name: template.name,
      patient: patient || {},
      encounter: encounter || {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
        type: 'rounds',
        location: '',
        providers: []
      },
      sections,
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      status: 'draft'
    }
  }
}