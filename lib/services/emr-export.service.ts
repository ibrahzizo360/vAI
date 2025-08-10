// Database types
interface ClinicalNote {
  _id: string
  encounter_date: string
  encounter_type: string
  encounter_location: string
  note_sections: Record<string, string>
  raw_transcript?: string
  status: string
  primary_provider: string
  attending_physician: string
  completeness_score: number
  created_at: string
  updated_at: string
}

interface Patient {
  _id: string
  mrn: string
  name: string
  dob: string
  age: number
  sex: string
  primary_diagnosis: string
}

export interface EMRExportOptions {
  format: 'pdf' | 'hl7' | 'fhir' | 'epic' | 'cerner' | 'text' | 'rtf'
  include_metadata: boolean
  include_timestamps: boolean
  patient_identifiers: boolean
  provider_signature?: string
}

interface NoteWithPatient {
  note: ClinicalNote
  patient: Patient
}

export interface ExportedDocument {
  format: string
  content: string | Buffer
  filename: string
  mime_type: string
  size: number
  generated_at: string
}

export class EMRExportService {
  
  static async exportMedicalNote(
    noteData: NoteWithPatient,
    options: EMRExportOptions
  ): Promise<ExportedDocument> {
    
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(noteData, options)
      case 'hl7':
        return this.exportToHL7(noteData, options)
      case 'fhir':
        return this.exportToFHIR(noteData, options)
      case 'epic':
        return this.exportToEpic(noteData, options)
      case 'cerner':
        return this.exportToCerner(noteData, options)
      case 'rtf':
        return this.exportToRTF(noteData, options)
      case 'text':
      default:
        return this.exportToText(noteData, options)
    }
  }

  private static async exportToPDF(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    // For a real implementation, you would use a PDF library like jsPDF or puppeteer
    const textContent = this.generateFormattedText(noteData, options)
    
    return {
      format: 'pdf',
      content: textContent, // In real implementation, this would be PDF buffer
      filename: `${noteData.patient.name?.replace(/\\s+/g, '_') || 'patient'}_${noteData.note.encounter_type}_${new Date().toISOString().split('T')[0]}.pdf`,
      mime_type: 'application/pdf',
      size: textContent.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToHL7(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    const hl7Message = this.generateHL7Message(noteData, options)
    
    return {
      format: 'hl7',
      content: hl7Message,
      filename: `${noteData.patient.mrn || 'patient'}_${noteData.note.encounter_type}_${Date.now()}.hl7`,
      mime_type: 'text/plain',
      size: hl7Message.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToFHIR(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    const fhirResource = this.generateFHIRResource(noteData, options)
    const fhirJson = JSON.stringify(fhirResource, null, 2)
    
    return {
      format: 'fhir',
      content: fhirJson,
      filename: `${noteData.patient.mrn || 'patient'}_${noteData.note.encounter_type}_${Date.now()}.json`,
      mime_type: 'application/fhir+json',
      size: fhirJson.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToEpic(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    // Epic MyChart compatible format
    const epicFormat = this.generateEpicFormat(noteData, options)
    
    return {
      format: 'epic',
      content: epicFormat,
      filename: `Epic_${noteData.patient.mrn || 'patient'}_${Date.now()}.txt`,
      mime_type: 'text/plain',
      size: epicFormat.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToCerner(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    // Cerner PowerChart compatible format
    const cernerFormat = this.generateCernerFormat(noteData, options)
    
    return {
      format: 'cerner',
      content: cernerFormat,
      filename: `Cerner_${noteData.patient.mrn || 'patient'}_${Date.now()}.txt`,
      mime_type: 'text/plain',
      size: cernerFormat.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToRTF(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    const rtfContent = this.generateRTFContent(noteData, options)
    
    return {
      format: 'rtf',
      content: rtfContent,
      filename: `${noteData.patient.name?.replace(/\\s+/g, '_') || 'patient'}_${noteData.note.encounter_type}.rtf`,
      mime_type: 'application/rtf',
      size: rtfContent.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToText(noteData: NoteWithPatient, options: EMRExportOptions): Promise<ExportedDocument> {
    const textContent = this.generateFormattedText(noteData, options)
    
    return {
      format: 'text',
      content: textContent,
      filename: `${noteData.patient.name?.replace(/\\s+/g, '_') || 'patient'}_${noteData.note.encounter_type}.txt`,
      mime_type: 'text/plain',
      size: textContent.length,
      generated_at: new Date().toISOString()
    }
  }

  // Format generators
  private static generateFormattedText(noteData: NoteWithPatient, options: EMRExportOptions): string {
    const { note, patient } = noteData
    const lines: string[] = []
    
    // Header
    lines.push('='.repeat(80))
    lines.push(` ${this.formatEncounterType(note.encounter_type).toUpperCase()} NOTE`)
    lines.push('='.repeat(80))
    lines.push('')
    
    // Patient Information (if enabled)
    if (options.patient_identifiers) {
      lines.push('PATIENT INFORMATION:')
      if (patient.name) lines.push(`Name: ${patient.name}`)
      if (patient.mrn) lines.push(`MRN: ${patient.mrn}`)
      if (patient.dob) lines.push(`DOB: ${new Date(patient.dob).toLocaleDateString()}`)
      if (patient.age) lines.push(`Age: ${patient.age}`)
      if (patient.sex) lines.push(`Sex: ${patient.sex}`)
      if (patient.primary_diagnosis) lines.push(`Primary Diagnosis: ${patient.primary_diagnosis}`)
      lines.push('')
    }
    
    // Encounter Information
    lines.push('ENCOUNTER INFORMATION:')
    lines.push(`Date: ${new Date(note.encounter_date).toLocaleDateString()}`)
    lines.push(`Time: ${new Date(note.encounter_date).toLocaleTimeString()}`)
    lines.push(`Type: ${this.formatEncounterType(note.encounter_type)}`)
    lines.push(`Location: ${note.encounter_location}`)
    lines.push(`Attending Physician: ${note.attending_physician}`)
    if (note.primary_provider !== note.attending_physician) {
      lines.push(`Primary Provider: ${note.primary_provider}`)
    }
    lines.push('')
    
    // Note Sections
    Object.entries(note.note_sections).forEach(([sectionId, content]) => {
      const sectionTitle = this.formatSectionTitle(sectionId)
      lines.push(`${sectionTitle}:`)
      lines.push('-'.repeat(sectionTitle.length + 1))
      lines.push(content || 'No content documented.')
      lines.push('')
    })
    
    // Metadata (if enabled)
    if (options.include_metadata) {
      lines.push('DOCUMENT METADATA:')
      lines.push(`Status: ${note.status}`)
      lines.push(`Completeness Score: ${note.completeness_score}%`)
      lines.push(`Created: ${new Date(note.created_at).toLocaleString()}`)
      lines.push(`Last Modified: ${new Date(note.updated_at).toLocaleString()}`)
      lines.push('')
    }
    
    // Provider Signature (if provided)
    if (options.provider_signature) {
      lines.push('PROVIDER SIGNATURE:')
      lines.push(options.provider_signature)
      lines.push(`Electronically signed on ${new Date().toLocaleString()}`)
    }
    
    return lines.join('\\n')
  }

  private static generateHL7Message(noteData: NoteWithPatient, options: EMRExportOptions): string {
    const { note, patient } = noteData
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const messageId = Math.random().toString(36).substring(2).toUpperCase()
    
    const lines: string[] = []
    
    // MSH - Message Header
    lines.push(`MSH|^~\\\\&|vAI|CLINIC|EMR|HOSPITAL|${timestamp}||MDM^T02|${messageId}|P|2.5`)
    
    // PID - Patient Identification
    if (options.patient_identifiers && patient.mrn) {
      lines.push(`PID|1||${patient.mrn}||${patient.name || 'UNKNOWN'}||${patient.dob || ''}|${patient.sex || ''}`)
    }
    
    // TXA - Transcription Document Header
    lines.push(`TXA|1|${note.encounter_type}|${this.formatEncounterType(note.encounter_type)}||${timestamp}||||||||${note.status}|||${timestamp}`)
    
    // OBX - Observation/Result for note content
    let segmentIndex = 1
    Object.entries(note.note_sections).forEach(([sectionId, content]) => {
      const sectionTitle = this.formatSectionTitle(sectionId)
      lines.push(`OBX|${segmentIndex}|TX|${sectionId}^${sectionTitle}||${content || ''}|||||F`)
      segmentIndex++
    })
    
    return lines.join('\\r\\n')
  }

  private static generateFHIRResource(noteData: NoteWithPatient, options: EMRExportOptions): any {
    const { note, patient } = noteData
    
    const resource = {
      resourceType: 'DocumentReference',
      id: `note-${note._id}`,
      status: note.status === 'signed' ? 'current' : 'draft',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: this.getLoincCodeForTemplate(note.encounter_type),
            display: this.formatEncounterType(note.encounter_type)
          }
        ]
      },
      subject: options.patient_identifiers ? {
        reference: `Patient/${patient.mrn}`,
        display: patient.name
      } : undefined,
      date: note.created_at,
      author: [
        {
          display: note.attending_physician || 'Provider'
        }
      ],
      content: [
        {
          attachment: {
            contentType: 'text/plain',
            data: Buffer.from(this.generateFormattedText(noteData, options)).toString('base64')
          }
        }
      ],
      context: {
        encounter: {
          reference: `Encounter/${note._id}`
        },
        period: {
          start: note.encounter_date
        }
      }
    }
    
    return resource
  }

  private static generateEpicFormat(noteData: NoteWithPatient, options: EMRExportOptions): string {
    const { note } = noteData
    const lines: string[] = []
    
    // Epic-specific header format
    lines.push(`NOTE_TYPE: ${this.formatEncounterType(note.encounter_type)}`)
    lines.push(`ENCOUNTER_DATE: ${note.encounter_date}`)
    lines.push(`PROVIDER: ${note.attending_physician}`)
    lines.push('')
    
    // Note content in Epic format
    Object.entries(note.note_sections).forEach(([sectionId, content]) => {
      lines.push(`${sectionId.toUpperCase()}:`)
      lines.push(content || '')
      lines.push('')
    })
    
    return lines.join('\\n')
  }

  private static generateCernerFormat(noteData: NoteWithPatient, options: EMRExportOptions): string {
    const { note } = noteData
    const lines: string[] = []
    
    // Cerner-specific format
    lines.push('BEGIN_NOTE')
    lines.push(`NOTE_TYPE=${this.formatEncounterType(note.encounter_type)}`)
    lines.push(`DATE=${note.encounter_date}`)
    lines.push(`PROVIDER=${note.attending_physician}`)
    lines.push('')
    
    Object.entries(note.note_sections).forEach(([sectionId, content]) => {
      lines.push(`[${sectionId.toUpperCase()}]`)
      lines.push(content || '')
      lines.push('')
    })
    
    lines.push('END_NOTE')
    
    return lines.join('\\n')
  }

  private static generateRTFContent(noteData: NoteWithPatient, options: EMRExportOptions): string {
    const plainText = this.generateFormattedText(noteData, options)
    
    // Basic RTF wrapper (for a full implementation, use a proper RTF library)
    return `{\\\\rtf1\\\\ansi\\\\deff0 {\\\\fonttbl {\\\\f0 Times New Roman;}}\\\\f0\\\\fs24 ${plainText.replace(/\\n/g, '\\\\par ')}}`
  }

  // Utility methods
  private static formatSectionTitle(sectionId: string): string {
    return sectionId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private static formatEncounterType(type: string): string {
    const formatted = {
      rounds: "Ward Round",
      consult: "Consultation",
      family_meeting: "Family Meeting",
      procedure: "Procedure Note",
      discharge: "Discharge Summary",
      emergency: "Emergency Note",
    }
    return formatted[type as keyof typeof formatted] || type
  }

  private static getLoincCodeForTemplate(templateId: string): string {
    const loincCodes: { [key: string]: string } = {
      'rounds': '11506-3',
      'consult': '11488-4',
      'family_meeting': '77597-3',
      'procedure': '28570-0',
      'discharge': '18842-5',
      'emergency': '34111-5'
    }
    
    return loincCodes[templateId] || '11506-3' // Default to progress note
  }

  // Export multiple notes as a bundle
  static async exportMultipleNotes(
    notesData: NoteWithPatient[],
    options: EMRExportOptions & { bundle_format?: 'zip' | 'pdf_combined' }
  ): Promise<ExportedDocument> {
    if (options.bundle_format === 'pdf_combined') {
      // Combine all notes into a single document
      const combinedContent = notesData.map(noteData => 
        this.generateFormattedText(noteData, options)
      ).join('\\n\\n' + '='.repeat(80) + '\\n\\n')
      
      return {
        format: 'pdf',
        content: combinedContent,
        filename: `combined_notes_${new Date().toISOString().split('T')[0]}.pdf`,
        mime_type: 'application/pdf',
        size: combinedContent.length,
        generated_at: new Date().toISOString()
      }
    }
    
    // Default: return as individual text files (in real app, would create ZIP)
    const combinedContent = notesData.map(noteData => 
      this.generateFormattedText(noteData, options)
    ).join('\\n\\n' + '='.repeat(80) + '\\n\\n')
    
    return {
      format: 'text',
      content: combinedContent,
      filename: `multiple_notes_${Date.now()}.txt`,
      mime_type: 'text/plain',
      size: combinedContent.length,
      generated_at: new Date().toISOString()
    }
  }
}