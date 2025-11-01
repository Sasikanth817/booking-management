import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/'
const MONGODB_DB = process.env.MONGODB_DB || 'GHM'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local')
}

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = (global as any).mongoose
  || { conn: null, promise: null }

export default async function dbConnect() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(`${MONGODB_URI}${MONGODB_DB}`, {
      bufferCommands: false,
    })
  }
  cached.conn = await cached.promise
  ;(global as any).mongoose = cached
  return cached.conn
}
