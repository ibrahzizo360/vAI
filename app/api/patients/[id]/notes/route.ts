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
    const { id } = await params
    console.log('Notes API called with params:', { id })
    
    try {
      await connectDB()
      console.log('Database connection established')
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      )
    }
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    let query: any = {}
    
    // If ID is not *, filter by specific patient
    if (id !== '*') {
      // Validate ObjectId format for specific patient
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return NextResponse.json(
          { error: 'Invalid patient ID format' },
          { status: 400 }
        )
      }
      query.patient_id = id
    }
    
    console.log('Query:', query, 'Page:', page, 'Limit:', limit)

    // Get clinical notes first
    const notes = await ClinicalNote.find(query)
      .sort({ encounter_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .catch(err => {
        console.error('Error finding clinical notes:', err)
        throw new Error(`Database query failed: ${err.message}`)
      })

    const total = await ClinicalNote.countDocuments(query)
      .catch(err => {
        console.error('Error counting clinical notes:', err)
        throw new Error(`Count query failed: ${err.message}`)
      })

    // Get unique patient IDs from the notes
    const patientIds = [...new Set(notes
      .map(note => note.patient_id)
      .filter(id => id) // Filter out null/undefined
    )]

    // Fetch patient information separately (only if we have patient IDs)
    let patients = []
    if (patientIds.length > 0) {
      patients = await Patient.find(
        { _id: { $in: patientIds } },
        'mrn name primary_diagnosis'
      ).lean()
        .catch(err => {
          console.error('Error finding patients:', err)
          // Don't throw here, just return empty array to continue processing
          return []
        })
    }

    // Create a patient lookup map
    const patientMap = new Map(patients.map(p => [p._id.toString(), p]))

    // Transform the data to match frontend expectations
    const transformedNotes = notes.map(note => ({
      ...note,
      patient: note.patient_id ? patientMap.get(note.patient_id.toString()) : null
    })).filter(note => note.patient) // Filter out notes without valid patient data

    console.log(`Found ${transformedNotes.length} notes out of ${total} total`)
    
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
    console.error('Error retrieving clinical notes:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      params: { id },
      url: request.url
    })
    
    // Return more specific error information in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve clinical notes',
        details: isDevelopment ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB()
    
    const { id } = await params
    const noteData = await request.json()
    
    const newNote = new ClinicalNote({
      ...noteData,
      patient_id: id,
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