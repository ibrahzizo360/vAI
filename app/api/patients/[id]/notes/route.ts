import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'
import Patient from '@/lib/mongodb/models/Patient'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    let query: any = {}
    
    // If ID is not *, filter by specific patient
    if (params.id !== '*') {
      query.patient_id = params.id
    }

    // Get clinical notes with patient information
    const notes = await ClinicalNote.find(query)
      .sort({ encounter_date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patient_id', 'mrn name primary_diagnosis')
      .lean()

    const total = await ClinicalNote.countDocuments(query)

    // Transform the data to match frontend expectations
    const transformedNotes = notes.map(note => ({
      ...note,
      patient: note.patient_id
    }))

    const response = NextResponse.json({
      notes: transformedNotes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Error retrieving clinical notes:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve clinical notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const noteData = await request.json()
    
    const newNote = new ClinicalNote({
      ...noteData,
      patient_id: params.id,
      created_at: new Date(),
      updated_at: new Date()
    })
    
    await newNote.save()
    
    // Populate patient information
    await newNote.populate('patient_id', 'mrn name primary_diagnosis')
    
    const response = NextResponse.json({
      note: newNote,
      message: 'Clinical note created successfully'
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error creating clinical note:', error)
    return NextResponse.json(
      { error: 'Failed to create clinical note' },
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