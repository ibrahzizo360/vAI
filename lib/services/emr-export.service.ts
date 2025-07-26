import { GeneratedMedicalNote } from '../templates/medical-note-templates'

export interface EMRExportOptions {
  format: 'pdf' | 'hl7' | 'fhir' | 'epic' | 'cerner' | 'text' | 'rtf'
  include_metadata: boolean
  include_timestamps: boolean
  patient_identifiers: boolean
  provider_signature?: string
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
    note: GeneratedMedicalNote,
    options: EMRExportOptions
  ): Promise<ExportedDocument> {
    
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(note, options)
      case 'hl7':
        return this.exportToHL7(note, options)
      case 'fhir':
        return this.exportToFHIR(note, options)
      case 'epic':
        return this.exportToEpic(note, options)
      case 'cerner':
        return this.exportToCerner(note, options)
      case 'rtf':
        return this.exportToRTF(note, options)
      case 'text':
      default:
        return this.exportToText(note, options)
    }
  }

  private static async exportToPDF(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    // For a real implementation, you would use a PDF library like jsPDF or puppeteer
    const textContent = this.generateFormattedText(note, options)
    
    return {
      format: 'pdf',
      content: textContent, // In real implementation, this would be PDF buffer
      filename: `${note.patient.name?.replace(/\s+/g, '_') || 'patient'}_${note.template_id}_${new Date().toISOString().split('T')[0]}.pdf`,
      mime_type: 'application/pdf',
      size: textContent.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToHL7(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    const hl7Message = this.generateHL7Message(note, options)
    
    return {
      format: 'hl7',
      content: hl7Message,
      filename: `${note.patient.mrn || 'patient'}_${note.template_id}_${Date.now()}.hl7`,
      mime_type: 'text/plain',
      size: hl7Message.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToFHIR(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    const fhirResource = this.generateFHIRResource(note, options)
    const fhirJson = JSON.stringify(fhirResource, null, 2)
    
    return {
      format: 'fhir',
      content: fhirJson,
      filename: `${note.patient.mrn || 'patient'}_${note.template_id}_${Date.now()}.json`,
      mime_type: 'application/fhir+json',
      size: fhirJson.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToEpic(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    // Epic MyChart compatible format
    const epicFormat = this.generateEpicFormat(note, options)
    
    return {
      format: 'epic',
      content: epicFormat,
      filename: `Epic_${note.patient.mrn || 'patient'}_${Date.now()}.txt`,
      mime_type: 'text/plain',
      size: epicFormat.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToCerner(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    // Cerner PowerChart compatible format
    const cernerFormat = this.generateCernerFormat(note, options)
    
    return {
      format: 'cerner',
      content: cernerFormat,
      filename: `Cerner_${note.patient.mrn || 'patient'}_${Date.now()}.txt`,
      mime_type: 'text/plain',
      size: cernerFormat.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToRTF(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    const rtfContent = this.generateRTFContent(note, options)
    
    return {
      format: 'rtf',
      content: rtfContent,
      filename: `${note.patient.name?.replace(/\s+/g, '_') || 'patient'}_${note.template_id}.rtf`,
      mime_type: 'application/rtf',
      size: rtfContent.length,
      generated_at: new Date().toISOString()
    }
  }

  private static async exportToText(note: GeneratedMedicalNote, options: EMRExportOptions): Promise<ExportedDocument> {
    const textContent = this.generateFormattedText(note, options)
    
    return {
      format: 'text',
      content: textContent,
      filename: `${note.patient.name?.replace(/\s+/g, '_') || 'patient'}_${note.template_id}.txt`,
      mime_type: 'text/plain',
      size: textContent.length,
      generated_at: new Date().toISOString()
    }
  }

  // Format generators
  private static generateFormattedText(note: GeneratedMedicalNote, options: EMRExportOptions): string {
    const lines: string[] = []
    
    // Header
    lines.push('=' * 80)
    lines.push(` ${note.template_name.toUpperCase()}`)
    lines.push('=' * 80)
    lines.push('')
    
    // Patient Information (if enabled)
    if (options.patient_identifiers) {
      lines.push('PATIENT INFORMATION:')
      if (note.patient.name) lines.push(`Name: ${note.patient.name}`)
      if (note.patient.mrn) lines.push(`MRN: ${note.patient.mrn}`)
      if (note.patient.dob) lines.push(`DOB: ${note.patient.dob}`)
      if (note.patient.age) lines.push(`Age: ${note.patient.age}`)
      lines.push('')
    }
    
    // Encounter Information
    lines.push('ENCOUNTER INFORMATION:')
    lines.push(`Date: ${note.encounter.date}`)
    lines.push(`Time: ${note.encounter.time}`)
    lines.push(`Type: ${note.encounter.type}`)
    lines.push(`Location: ${note.encounter.location}`)
    if (note.encounter.providers.length > 0) {
      lines.push(`Provider(s): ${note.encounter.providers.join(', ')}`)
    }
    lines.push('')
    
    // Note Sections
    Object.entries(note.sections).forEach(([sectionId, content]) => {
      const sectionTitle = this.formatSectionTitle(sectionId)
      lines.push(`${sectionTitle}:`)
      lines.push('-' * sectionTitle.length)
      lines.push(content || 'No content documented.')
      lines.push('')
    })
    
    // Metadata (if enabled)
    if (options.include_metadata) {
      lines.push('DOCUMENT METADATA:')
      lines.push(`Status: ${note.status}`)
      lines.push(`Created: ${note.created_at}`)
      lines.push(`Last Modified: ${note.last_modified}`)
      lines.push('')
    }
    
    // Provider Signature (if provided)
    if (options.provider_signature) {
      lines.push('PROVIDER SIGNATURE:')
      lines.push(options.provider_signature)
      lines.push(`Electronically signed on ${new Date().toISOString()}`)
    }
    
    return lines.join('\n')
  }

  private static generateHL7Message(note: GeneratedMedicalNote, options: EMRExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const messageId = Math.random().toString(36).substring(2).toUpperCase()
    
    const lines: string[] = []
    
    // MSH - Message Header
    lines.push(`MSH|^~\\&|vAI|CLINIC|EMR|HOSPITAL|${timestamp}||MDM^T02|${messageId}|P|2.5`)
    
    // PID - Patient Identification
    if (options.patient_identifiers && note.patient.mrn) {
      lines.push(`PID|1||${note.patient.mrn}||${note.patient.name || 'UNKNOWN'}||${note.patient.dob || ''}|${note.patient.sex || ''}`)
    }
    
    // TXA - Transcription Document Header
    lines.push(`TXA|1|${note.template_id}|${note.template_name}||${timestamp}||||||||${note.status}|||${timestamp}`)
    
    // OBX - Observation/Result for note content
    let segmentIndex = 1
    Object.entries(note.sections).forEach(([sectionId, content]) => {
      const sectionTitle = this.formatSectionTitle(sectionId)
      lines.push(`OBX|${segmentIndex}|TX|${sectionId}^${sectionTitle}||${content || ''}|||||F`)
      segmentIndex++
    })
    
    return lines.join('\r\n')
  }

  private static generateFHIRResource(note: GeneratedMedicalNote, options: EMRExportOptions): any {
    const resource = {
      resourceType: 'DocumentReference',
      id: `note-${Math.random().toString(36).substring(2)}`,
      status: note.status === 'signed' ? 'current' : 'draft',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: this.getLoincCodeForTemplate(note.template_id),
            display: note.template_name
          }
        ]
      },
      subject: options.patient_identifiers ? {
        reference: `Patient/${note.patient.mrn}`,
        display: note.patient.name
      } : undefined,
      date: note.created_at,
      author: [
        {
          display: note.encounter.providers.join(', ') || 'Provider'
        }
      ],
      content: [
        {
          attachment: {
            contentType: 'text/plain',
            data: Buffer.from(this.generateFormattedText(note, options)).toString('base64')
          }
        }
      ],
      context: {
        encounter: {
          reference: `Encounter/${note.encounter.date}-${note.encounter.type}`
        },
        period: {
          start: note.encounter.date
        }
      }
    }
    
    return resource
  }

  private static generateEpicFormat(note: GeneratedMedicalNote, options: EMRExportOptions): string {
    const lines: string[] = []
    
    // Epic-specific header format
    lines.push(`NOTE_TYPE: ${note.template_name}`)
    lines.push(`ENCOUNTER_DATE: ${note.encounter.date}`)
    lines.push(`PROVIDER: ${note.encounter.providers.join(', ')}`)
    lines.push('')
    
    // Note content in Epic format
    Object.entries(note.sections).forEach(([sectionId, content]) => {
      lines.push(`${sectionId.toUpperCase()}:`)
      lines.push(content || '')
      lines.push('')
    })
    
    return lines.join('\n')
  }

  private static generateCernerFormat(note: GeneratedMedicalNote, options: EMRExportOptions): string {
    const lines: string[] = []
    
    // Cerner-specific format
    lines.push('BEGIN_NOTE')
    lines.push(`NOTE_TYPE=${note.template_name}`)
    lines.push(`DATE=${note.encounter.date}`)
    lines.push(`PROVIDER=${note.encounter.providers.join(', ')}`)
    lines.push('')
    
    Object.entries(note.sections).forEach(([sectionId, content]) => {
      lines.push(`[${sectionId.toUpperCase()}]`)
      lines.push(content || '')
      lines.push('')
    })
    
    lines.push('END_NOTE')
    
    return lines.join('\n')
  }

  private static generateRTFContent(note: GeneratedMedicalNote, options: EMRExportOptions): string {
    const plainText = this.generateFormattedText(note, options)
    
    // Basic RTF wrapper (for a full implementation, use a proper RTF library)
    return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ${plainText.replace(/\n/g, '\\par ')}}`
  }

  // Utility methods
  private static formatSectionTitle(sectionId: string): string {
    return sectionId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private static getLoincCodeForTemplate(templateId: string): string {
    const loincCodes: { [key: string]: string } = {
      'neuro_rounds': '11506-3',
      'neuro_consult': '11488-4',
      'family_meeting': '77597-3',
      'progress_note': '11506-3',
      'discharge_summary': '18842-5'
    }
    
    return loincCodes[templateId] || '11506-3' // Default to progress note
  }

  // Export multiple notes as a bundle
  static async exportMultipleNotes(
    notes: GeneratedMedicalNote[],
    options: EMRExportOptions & { bundle_format?: 'zip' | 'pdf_combined' }
  ): Promise<ExportedDocument> {
    if (options.bundle_format === 'pdf_combined') {
      // Combine all notes into a single document
      const combinedContent = notes.map(note => 
        this.generateFormattedText(note, options)
      ).join('\n\n' + '='.repeat(80) + '\n\n')
      
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
    const combinedContent = notes.map(note => 
      this.generateFormattedText(note, options)
    ).join('\n\n' + '='.repeat(80) + '\n\n')
    
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