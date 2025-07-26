import { NextRequest, NextResponse } from 'next/server'
import { EMRExportService } from '@/lib/services/emr-export.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notes, export_options } = body
    
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json(
        { error: 'No notes provided for export' },
        { status: 400 }
      )
    }
    
    const options = {
      format: export_options?.format || 'text',
      include_metadata: export_options?.include_metadata ?? true,
      include_timestamps: export_options?.include_timestamps ?? true,
      patient_identifiers: export_options?.patient_identifiers ?? true,
      provider_signature: export_options?.provider_signature
    }
    
    let exportedDocument
    
    if (notes.length === 1) {
      // Single note export
      exportedDocument = await EMRExportService.exportMedicalNote(notes[0], options)
    } else {
      // Multiple notes export
      exportedDocument = await EMRExportService.exportMultipleNotes(notes, {
        ...options,
        bundle_format: export_options?.bundle_format || 'zip'
      })
    }
    
    // For file downloads, we return the content as base64 with metadata
    const response = {
      export_info: {
        format: exportedDocument.format,
        filename: exportedDocument.filename,
        mime_type: exportedDocument.mime_type,
        size: exportedDocument.size,
        generated_at: exportedDocument.generated_at,
        note_count: notes.length
      },
      content: typeof exportedDocument.content === 'string' 
        ? Buffer.from(exportedDocument.content).toString('base64')
        : exportedDocument.content.toString('base64'),
      download_url: `/api/download/${Buffer.from(exportedDocument.filename).toString('base64')}`
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export medical notes' },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving export templates/options
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const info_type = url.searchParams.get('info')
    
    if (info_type === 'formats') {
      return NextResponse.json({
        supported_formats: [
          {
            id: 'text',
            name: 'Plain Text',
            description: 'Simple text format for basic documentation',
            mime_type: 'text/plain',
            extension: '.txt'
          },
          {
            id: 'pdf',
            name: 'PDF Document',
            description: 'Formatted PDF document for sharing and printing',
            mime_type: 'application/pdf',
            extension: '.pdf'
          },
          {
            id: 'rtf',
            name: 'Rich Text Format',
            description: 'RTF format compatible with most word processors',
            mime_type: 'application/rtf',
            extension: '.rtf'
          },
          {
            id: 'hl7',
            name: 'HL7 Message',
            description: 'HL7 v2.5 format for healthcare interoperability',
            mime_type: 'text/plain',
            extension: '.hl7'
          },
          {
            id: 'fhir',
            name: 'FHIR Resource',
            description: 'FHIR R4 DocumentReference resource',
            mime_type: 'application/fhir+json',
            extension: '.json'
          },
          {
            id: 'epic',
            name: 'Epic MyChart',
            description: 'Epic EMR compatible format',
            mime_type: 'text/plain',
            extension: '.txt'
          },
          {
            id: 'cerner',
            name: 'Cerner PowerChart',
            description: 'Cerner EMR compatible format',
            mime_type: 'text/plain',
            extension: '.txt'
          }
        ]
      })
    }
    
    if (info_type === 'options') {
      return NextResponse.json({
        export_options: {
          include_metadata: {
            type: 'boolean',
            default: true,
            description: 'Include document creation and modification timestamps'
          },
          include_timestamps: {
            type: 'boolean',
            default: true,
            description: 'Include encounter timestamps and timing information'
          },
          patient_identifiers: {
            type: 'boolean',
            default: true,
            description: 'Include patient identifying information (MRN, name, DOB)'
          },
          provider_signature: {
            type: 'string',
            default: null,
            description: 'Electronic signature text to include'
          },
          bundle_format: {
            type: 'select',
            options: ['zip', 'pdf_combined'],
            default: 'zip',
            description: 'Format for exporting multiple notes'
          }
        }
      })
    }
    
    // Default: return general export information
    return NextResponse.json({
      export_service: 'vAI Clinical Documentation Export',
      version: '1.0.0',
      supported_formats_count: 7,
      max_notes_per_export: 100,
      max_file_size_mb: 50
    })
    
  } catch (error) {
    console.error('Export info error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve export information' },
      { status: 500 }
    )
  }
}

// Handle CORS for development
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}