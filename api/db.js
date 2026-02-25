const mongoose = require('mongoose');

let isConnected = false;

async function connect() {
  // Return early if already connected
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // ✅ Get and sanitize URI
  let MONGODB_URI = process.env.MONGODB_URI;

  if (typeof MONGODB_URI === 'string') {
    MONGODB_URI = MONGODB_URI.trim()
      .replace(/^"(.*)"$/, '$1')
      .replace(/^'(.*)'$/, '$1');
  }

  // ✅ Validate BEFORE doing anything else
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set. Add it in Vercel → Settings → Environment Variables.');
  }

  if (MONGODB_URI.includes('<password>')) {
    throw new Error('MONGODB_URI still contains the <password> placeholder. Replace it with your real password.');
  }

  if ((MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost')) && process.env.VERCEL === '1') {
    throw new Error('MONGODB_URI cannot be localhost on Vercel. Use a MongoDB Atlas URI.');
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
