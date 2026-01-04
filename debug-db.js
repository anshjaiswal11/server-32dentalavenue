require('dotenv').config();
const { connect } = require('./api/db');

console.log('Testing DB connection...');
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set in env');
} else {
  // Mask password for safety in logs
  const masked = uri.replace(/:([^:@]+)@/, ':****@');
  console.log('URI:', masked);
}

connect()
  .then(() => {
    console.log('Success: Connected to DB');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Connection failed:', err.name);
    console.error('Message:', err.message);
    // console.error('Full Error:', JSON.stringify(err, null, 2)); // Optional
    process.exit(1);
  });
