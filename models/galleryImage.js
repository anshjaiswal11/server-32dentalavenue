const { mongoose } = require('../api/db');
const { Schema } = mongoose;

const galleryImageSchema = new Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['Clinic Interiors', 'Happy Smiles', 'Advanced Equipment'],
  },
  publicId: { type: String, required: true }, // Cloudinary public_id (needed for deletion)
  imageUrl: { type: String, required: true },  // Full Cloudinary delivery URL
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.GalleryImage ||
  mongoose.model('GalleryImage', galleryImageSchema);
