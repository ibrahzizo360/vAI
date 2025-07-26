import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb/connection'
import Patient from '@/lib/mongodb/models/Patient'
import ClinicalNote from '@/lib/mongodb/models/ClinicalNote'

// GET /api/patients - List all patients with advanced filtering
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const location = url.searchParams.get('location')
    const attending = url.searchParams.get('attending')
    const status = url.searchParams.get('status') || 'Active'
    const diagnosis = url.searchParams.get('diagnosis')
    const monitoring = url.searchParams.get('monitoring')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    // Build query
    const query: any = {}
    
    if (status !== 'all') {
      query.status = status
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mrn: { $regex: search, $options: 'i' } },
        { primary_diagnosis: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (location) {
      query.current_location = location
    }
    
    if (attending) {
      query.attending_physician = attending
    }
    
    if (diagnosis) {
      query.primary_diagnosis = { $regex: diagnosis, $options: 'i' }
    }
    
    if (monitoring) {
      switch (monitoring) {
        case 'icp':
          query['monitoring.icp_monitor'] = true
          break
        case 'evd':
          query['monitoring.evd'] = true
          break
        case 'ventilator':
          query['monitoring.ventilator'] = true
          break
      }
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit
    const patients = await Patient.find(query)
      .sort({ admission_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    const total = await Patient.countDocuments(query)
    
    // Get unique values for filters
    const locations = await Patient.distinct('current_location', { status: 'Active' })
    const attendingPhysicians = await Patient.distinct('attending_physician', { status: 'Active' })
    const diagnoses = await Patient.distinct('primary_diagnosis', { status: 'Active' })
    
    const response = NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        locations: locations.sort(),
        attending_physicians: attendingPhysicians.sort(),
        diagnoses: diagnoses.sort()
      }
    })

    // Set cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('Error retrieving patients:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve patients' },
      { status: 500 }
    )
  }
}

// POST /api/patients - Create new patient or update existing
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { action, patient_data, note_data } = body
    
    if (action === 'create_patient') {
      // Create new patient
      const newPatient = new Patient({
        ...patient_data,
        mrn: patient_data.mrn || await generateUniqueMRN(),
        created_at: new Date(),
        updated_at: new Date()
      })
      
      await newPatient.save()
      
      const response = NextResponse.json({
        patient: newPatient,
        message: 'Patient created successfully'
      })
      
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      return response
    }
    
    if (action === 'update_patient') {
      const { patient_id, updates } = patient_data
      
      const updatedPatient = await Patient.findByIdAndUpdate(
        patient_id,
        { ...updates, updated_at: new Date() },
        { new: true, runValidators: true }
      )
      
      if (!updatedPatient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        patient: updatedPatient,
        message: 'Patient updated successfully'
      })
    }
    
    if (action === 'add_procedure') {
      const { patient_id, procedure } = patient_data
      
      const patient = await Patient.findById(patient_id)
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        )
      }
      
      patient.procedures.push(procedure)
      await patient.save()
      
      return NextResponse.json({
        patient,
        message: 'Procedure added successfully'
      })
    }
    
    if (action === 'link_note') {
      // Create clinical note linked to patient
      const newNote = new ClinicalNote({
        ...note_data,
        created_at: new Date(),
        updated_at: new Date()
      })
      
      await newNote.save()
      
      // Populate patient information
      await newNote.populate('patient_id', 'name mrn primary_diagnosis')
      
      return NextResponse.json({
        note: newNote,
        message: 'Clinical note linked to patient successfully'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Patient/Note creation error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Utility function to generate unique MRN
async function generateUniqueMRN(): Promise<string> {
  let mrn: string
  let exists = true
  
  while (exists) {
    const randomNum = Math.floor(Math.random() * 9000) + 1000
    mrn = `NSG${randomNum}`
    
    const existingPatient = await Patient.findOne({ mrn })
    exists = !!existingPatient
  }
  
  return mrn!
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