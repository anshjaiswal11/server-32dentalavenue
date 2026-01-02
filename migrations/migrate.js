const { connect } = require('../api/db');
const Booking = require('../models/booking');

async function migrate() {
  try {
    await connect();
    // ensure indexes are created
    await Booking.init();
    console.log('MongoDB migration applied (indexes ensured)');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
}

migrate();