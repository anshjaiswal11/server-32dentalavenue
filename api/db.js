const mongoose = require('mongoose');

// Read and sanitize MONGODB_URI (trim and remove surrounding quotes if provided in env)
// Hardcoded MongoDB URI (User requested)
// REPLACE <password> with your actual password
// const HARDCODED_URI = 'mongodb+srv://32detalavenue:32Dentalavenuebooking@32dentalbooking.uxym2bu.mongodb.net/?appName=32dentalbooking';

// Read MONGODB_URI (prefer env, fallback to hardcoded)
let MONGODB_URI = process.env.MONGODB_URI;

// Sanitize if string
if (typeof MONGODB_URI === 'string') {
  MONGODB_URI = MONGODB_URI.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

let isConnected = false;

async function connect() {
  // Return early if already connected
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Warn if using placeholder
  // Ensure MONGODB_URI is provided before calling string methods
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Add it in Vercel → Settings → Environment Variables.');
  }

  if (MONGODB_URI.includes('<password>')) {
    throw new Error('MONGODB_URI still contains the <password> placeholder. Replace it with your real password.');
  }

  // Warn if using placeholder
  if (typeof MONGODB_URI === 'string' && MONGODB_URI.includes('<password>')) {
    console.error('ERROR: MONGODB_URI contains "<password>" placeholder. Please update api/db.js with the real password.');
  }

  // On Vercel (serverless), local IPs won't work.
  if (typeof MONGODB_URI === 'string' && (MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost')) && process.env.VERCEL === '1') {
    throw new Error('MONGODB_URI cannot be localhost in Vercel deployment. Please use a MongoDB Atlas URI.');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
    });
    isConnected = true;
    console.log('✅ MongoDB Connected Successfully');
    return mongoose;
  } catch (err) {
    isConnected = false;
    throw new Error(`MongoDB connection failed: ${err.message}\n→ Check your MONGODB_URI and whitelist 0.0.0.0/0 in Atlas Network Access.`);
  }
}

module.exports = { connect, mongoose };
