const { mongoose } = require('../api/db');
const { Schema } = mongoose;

const bookingSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String, required: true },
  location: { type: String },
  bookingDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);