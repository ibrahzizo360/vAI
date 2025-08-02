import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import PatientMedia from '@/lib/mongodb/models/PatientMedia'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const mediaData = await request.json()
    
    // Validate required fields
    const requiredFields = [
      'patient_id',
      'cloudinary_public_id',
      'cloudinary_secure_url',
      'original_filename',
      'file_type',
      'mime_type',
      'file_size_bytes',
      'media_type',
      'captured_date',
      'uploaded_by'
    ]
    
    for (const field of requiredFields) {
      if (!mediaData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Create new media record
    const newMedia = new PatientMedia({
      ...mediaData,
      created_at: new Date(),
      updated_at: new Date()
    })
    
    await newMedia.save()
    
    // Populate patient information for response
    await newMedia.populate('patient_id', 'mrn name')
    
    const response = NextResponse.json({
      media: newMedia,
      message: 'Media uploaded successfully'
    })
    
    // Set cache control headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error saving media:', error)
    return NextResponse.json(
      { error: 'Failed to save media record' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const url = new URL(request.url)
    const patientId = url.searchParams.get('patient_id')
    const clinicalNoteId = url.searchParams.get('clinical_note_id')
    const mediaType = url.searchParams.get('media_type')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    let query: any = {}
    
    if (patientId) {
      query.patient_id = patientId
    }
    
    if (clinicalNoteId) {
      query.clinical_note_id = clinicalNoteId
    }
    
    if (mediaType) {
      query.media_type = mediaType
    }
    
    // Get media with patient information
    const media = await PatientMedia.find(query)
      .sort({ captured_date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patient_id', 'mrn name')
      .populate('clinical_note_id', 'encounter_date encounter_type')
      .lean()
    
    const total = await PatientMedia.countDocuments(query)
    
    const response = NextResponse.json({
      media,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response
    
  } catch (error) {
    console.error('Error retrieving media:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve media' },
      { status: 500 }
    )
  }
}

// Handle CORS
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