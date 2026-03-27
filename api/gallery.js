const { connect } = require('./db');
const GalleryImage = require('../models/galleryImage');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer: in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Helper: run multer as promise
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper: upload buffer to Cloudinary and return { publicId, imageUrl }
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        // f_auto: Cloudinary picks webp or avif based on browser support
        // q_auto: best quality/size ratio automatically
        transformation: [{ fetch_format: 'auto', quality: 'auto' }],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          publicId: result.public_id,
          imageUrl: result.secure_url,
        });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

// Helper: verify JWT and ensure admin role
function verifyAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    if (!payload || payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

const _cors = require('./_cors');

module.exports = async (req, res) => {
  // Always set CORS headers first — even if something below crashes
  _cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('[gallery] Unhandled error:', err && (err.stack || err.message));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', detail: err && err.message });
    }
  }
};

async function handleRequest(req, res) {
  try {
    await connect();
  } catch (err) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  // ── GET /api/gallery ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const images = await GalleryImage.find()
        .sort({ createdAt: -1 })
        .select('-__v');
      return res.json({ gallery: images });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch gallery' });
    }
  }

  // ── POST /api/gallery (admin only) ────────────────────────────────
  if (req.method === 'POST') {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      await runMulter(req, res);
    } catch (err) {
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    }

    const { title, category } = req.body || {};
    const file = req.file;

    if (!title || !category || !file) {
      return res.status(400).json({ error: 'title, category, and image are required' });
    }

    const validCategories = ['Clinic Interiors', 'Happy Smiles', 'Advanced Equipment'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check Cloudinary config
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ error: 'Cloudinary not configured — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Vercel environment variables' });
    }

    let publicId, imageUrl;
    try {
      ({ publicId, imageUrl } = await uploadToCloudinary(file.buffer, 'gallery'));
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Image upload failed: ' + err.message });
    }

    try {
      const doc = await GalleryImage.create({ title, category, publicId, imageUrl });
      return res.status(201).json({ message: 'Image uploaded', image: doc });
    } catch (err) {
      try { await cloudinary.uploader.destroy(publicId); } catch (_) {}
      return res.status(500).json({ error: 'Failed to save image metadata' });
    }
  }

  // ── DELETE /api/gallery/:id (admin only) ──────────────────────────
  if (req.method === 'DELETE') {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.url.split('/').filter(Boolean).pop();
    if (!id || id === 'gallery') {
      return res.status(400).json({ error: 'Missing image id' });
    }

    try {
      const doc = await GalleryImage.findById(id);
      if (!doc) return res.status(404).json({ error: 'Image not found' });

      try {
        await cloudinary.uploader.destroy(doc.publicId);
      } catch (err) {
        console.error('Cloudinary destroy error (non-fatal):', err.message);
      }

      await GalleryImage.findByIdAndDelete(id);
      return res.json({ message: 'Image deleted' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete image: ' + err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
  res.status(405).end('Method Not Allowed');
}

