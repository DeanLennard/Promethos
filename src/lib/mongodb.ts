// lib/mongodb.ts
import mongoose from 'mongoose';

// Define the shape of our cached connection store
type MongooseCache = {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
}

// Augment the NodeJS global so `global.mongoose` is typed
declare global {
    var mongoose: MongooseCache | undefined
}

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local')
}

// Use a cached connection across hot-reloads in development
const globalWithMongoose = global as typeof global & { mongoose?: MongooseCache }
const cached: MongooseCache = globalWithMongoose.mongoose || { conn: null, promise: null }
if (!globalWithMongoose.mongoose) {
    globalWithMongoose.mongoose = cached
}

export default async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn
    }
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGODB_URI!)
            .then((mongoose) => mongoose)
    }
    cached.conn = await cached.promise
    return cached.conn
}
