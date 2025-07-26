import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/mongodb/seed'

export async function POST(request: NextRequest) {
  try {
    // Only allow seeding in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database seeding not allowed in production' },
        { status: 403 }
      )
    }

    console.log('🌱 Starting database seeding...')
    const result = await seedDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: result
    })

  } catch (error) {
    console.error('❌ Seeding error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database seeding endpoint',
    usage: 'POST to this endpoint to seed the database with neurosurgical patient data',
    environment: process.env.NODE_ENV,
    seeding_allowed: process.env.NODE_ENV !== 'production'
  })
}