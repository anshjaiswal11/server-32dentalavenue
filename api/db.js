const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental';

let isConnected = false;

async function connect() {
  if (isConnected || mongoose.connection.readyState === 1) return mongoose;
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
    throw err;
  }
}

module.exports = { connect, mongoose };