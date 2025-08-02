import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import Patient from '@/lib/mongodb/models/Patient'

interface RouteParams {
  params: {
    id: string
    noteId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id: patientId, noteId } = params
    
    // Validate IDs
    if (!/^[0-9a-fA-F]{24}$/.test(patientId) || !/^[0-9a-fA-F]{24}$/.test(noteId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }
    
    // Find the note and verify it belongs to the patient
    // Define a type for the note to include extracted_content
    type ClinicalNoteType = {
      extracted_content?: {
        symptoms?: any[]
        vital_signs?: object
        medications_mentioned?: any[]
        procedures_mentioned?: any[]
        diagnoses_mentioned?: any[]
        follow_up_items?: any[]
      }
      audio_metadata?: object
      ai_analysis_metadata?: object
      [key: string]: any
    }

    const note = await ClinicalNote.findOne({
      _id: noteId,
      patient_id: patientId
    }).lean() as ClinicalNoteType | null
    
    if (!note) {
      return NextResponse.json(
        { error: 'Clinical note not found or does not belong to this patient' },
        { status: 404 }
      )
    }
    
    // Get patient details
    const patient = await Patient.findById(patientId)
      .select('mrn name dob age sex primary_diagnosis admission_date status current_location attending_physician')
      .lean()
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }
    
    // Transform the data to match frontend expectations
    const responseData = {
      note: {
        ...note,
        // Ensure extracted_content exists with all expected fields
        extracted_content: {
          symptoms: note.extracted_content?.symptoms || [],
          vital_signs: note.extracted_content?.vital_signs || {},
          medications_mentioned: note.extracted_content?.medications_mentioned || [],
          procedures_mentioned: note.extracted_content?.procedures_mentioned || [],
          diagnoses_mentioned: note.extracted_content?.diagnoses_mentioned || [],
          follow_up_items: note.extracted_content?.follow_up_items || []
        },
        // Ensure all metadata fields exist
        audio_metadata: note.audio_metadata || {},
        ai_analysis_metadata: note.ai_analysis_metadata || {}
      },
      patient
    }
    
    const response = NextResponse.json(responseData)
    
    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Error retrieving clinical note:', error)
    return NextResponse.json(
      { 
        error: 'Failed to retrieve clinical note',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id: patientId, noteId } = params
    const updates = await request.json()
    
    // Validate IDs
    if (!/^[0-9a-fA-F]{24}$/.test(patientId) || !/^[0-9a-fA-F]{24}$/.test(noteId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }
    
    // Verify note belongs to patient before updating
    const existingNote = await ClinicalNote.findOne({
      _id: noteId,
      patient_id: patientId
    })
    
    if (!existingNote) {
      return NextResponse.json(
        { error: 'Clinical note not found or does not belong to this patient' },
        { status: 404 }
      )
    }
    
    // Update the note
    const updatedNote = await ClinicalNote.findByIdAndUpdate(
      noteId,
      { 
        ...updates,
        updated_at: new Date(),
        // Prevent changing patient_id
        patient_id: patientId
      },
      { new: true, runValidators: true }
    )
    
    const response = NextResponse.json({
      note: updatedNote,
      message: 'Clinical note updated successfully'
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error updating clinical note:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update clinical note',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id: patientId, noteId } = params
    
    // Validate IDs
    if (!/^[0-9a-fA-F]{24}$/.test(patientId) || !/^[0-9a-fA-F]{24}$/.test(noteId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }
    
    // Verify note belongs to patient before deleting
    const existingNote = await ClinicalNote.findOne({
      _id: noteId,
      patient_id: patientId
    })
    
    if (!existingNote) {
      return NextResponse.json(
        { error: 'Clinical note not found or does not belong to this patient' },
        { status: 404 }
      )
    }
    
    await ClinicalNote.findByIdAndDelete(noteId)
    
    const response = NextResponse.json({
      message: 'Clinical note deleted successfully'
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error deleting clinical note:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete clinical note',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      },
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}