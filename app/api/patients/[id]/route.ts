import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/patients/[id] - Get individual patient with clinical notes
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id } = await params
    const patientId = id
    
    // Find patient by ID
    const patient = await Patient.findById(patientId).lean()
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }
    
    // Get clinical notes for this patient
    const clinicalNotes = await ClinicalNote.find({ patient_id: patientId })
      .sort({ encounter_date: -1 })
      .limit(10)
      .lean()
    
    // Calculate some basic stats
    const stats = {
      totalNotes: await ClinicalNote.countDocuments({ patient_id: patientId }),
      recentNotes: clinicalNotes.length,
      avgCompletenessScore: clinicalNotes.length > 0 
        ? Math.round(clinicalNotes.reduce((sum, note) => sum + (note.completeness_score || 0), 0) / clinicalNotes.length)
        : 0
    }
    
    const response = NextResponse.json({
      patient,
      clinicalNotes,
      stats
    })

    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Error retrieving patient:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve patient' },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[id] - Update patient
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id } = await params
    const patientId = id
    const updates = await request.json()
    
    const updatedPatient = await Patient.findByIdAndUpdate(
      patientId,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    )
    
    if (!updatedPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }
    
    const response = NextResponse.json({
      patient: updatedPatient,
      message: 'Patient updated successfully'
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error updating patient:', error)
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[id] - Delete patient
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id } = params
    const patientId = id
    
    // Delete all clinical notes associated with this patient
    await ClinicalNote.deleteMany({ patient_id: patientId })
    
    // Delete the patient
    const deletedPatient = await Patient.findByIdAndDelete(patientId)
    
    if (!deletedPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }
    
    const response = NextResponse.json({
      message: 'Patient and associated data deleted successfully'
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error deleting patient:', error)
    return NextResponse.json(
      { error: 'Failed to delete patient' },
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