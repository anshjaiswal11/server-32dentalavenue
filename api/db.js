const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental';

let isConnected = false;

async function connect() {
  if (isConnected || mongoose.connection.readyState === 1) return mongoose;

  // On Vercel (serverless), a local MongoDB URI will not work. Provide a remote `MONGODB_URI` (Atlas) via env vars.
  if ((MONGODB_URI.indexOf('127.0.0.1') !== -1 || MONGODB_URI.indexOf('localhost') !== -1) && process.env.VERCEL === '1') {
    throw new Error('MONGODB_URI not set for Vercel deployment. Set the MONGODB_URI environment variable in Vercel to a MongoDB Atlas URI and allow network access (e.g., temporary 0.0.0.0/0) in Atlas Network Access.');
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Fail faster if server is unreachable (ms)
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
    });
    isConnected = true;
    return mongoose;
  } catch (err) {
    // Ensure state is not left as connected
    isConnected = false;
    // Add actionable hint in the thrown error for easier debugging in logs
    const hint = '\nHint: Confirm your `MONGODB_URI` is correct, the credentials are valid, and your MongoDB Atlas cluster allows connections from your host (see https://www.mongodb.com/docs/atlas/security-whitelist/).';
    err.message = (err.message || '') + hint;
    throw err;
  }
}

module.exports = { connect, mongoose };