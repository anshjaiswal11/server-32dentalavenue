const { mongoose } = require('../api/db');
const { Schema } = mongoose;

const contactSchema = new Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, index: true },
  phone:     { type: String, required: true },
  location:  { type: String },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
