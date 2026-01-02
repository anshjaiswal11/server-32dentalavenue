const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dental';

let isConnected = false;

async function connect() {
  if (isConnected || mongoose.connection.readyState === 1) return mongoose;
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  return mongoose;
}

module.exports = { connect, mongoose };