import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Global cache to prevent multiple connections during development
declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || {
  conn: null,
  promise: null,
}

if (!global.mongoose) {
  global.mongoose = cached
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts)
  }

  try {
    cached.conn = await cached.promise
    console.log('✅ MongoDB connected successfully')
    return cached.conn
  } catch (e) {
    cached.promise = null
    console.error('❌ MongoDB connection error:', e)
    throw e
  }
}

export default connectDB