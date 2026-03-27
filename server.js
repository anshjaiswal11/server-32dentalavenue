const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const { connect } = require('./api/db');
const bookingsHandler = require('./api/bookings');
const contactHandler = require('./api/contact');
const loginHandler = require('./api/login');
const blogsRouter = require('./api/blogs');
const galleryHandler = require('./api/gallery');

const app = express();

// ✅ CORS — allow your frontend origin explicitly (avoids issues in production)
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ✅ FIX: Wait for DB before starting the server, not just logging errors
// The original code starts the server regardless of DB connection status,
// so requests come in before DB is ready — causing "database error"
async function startServer() {
  try {
    await connect();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // ✅ Exit so Vercel/host knows the function is broken, instead of silently failing
    process.exit(1);
  }

  // ✅ Routes defined AFTER confirmed DB connection
  app.post('/api/bookings', async (req, res) => {
    try {
      await bookingsHandler(req, res);
    } catch (err) {
      console.error('Bookings POST error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.get('/api/bookings', async (req, res) => {
    try {
      await bookingsHandler(req, res);
    } catch (err) {
      console.error('Bookings GET error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.delete('/api/bookings/:id', async (req, res) => {
    try {
      await bookingsHandler(req, res);
    } catch (err) {
      console.error('Bookings DELETE error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      await loginHandler(req, res);
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.use('/api/blogs', blogsRouter);

  // Gallery routes
  app.get('/api/gallery', async (req, res) => {
    try {
      await galleryHandler(req, res);
    } catch (err) {
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.post('/api/gallery', async (req, res) => {
    try {
      await galleryHandler(req, res);
    } catch (err) {
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.delete('/api/gallery/:id', async (req, res) => {
    try {
      await galleryHandler(req, res);
    } catch (err) {
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.post('/api/contact', async (req, res) => {
    try {
      await contactHandler(req, res);
    } catch (err) {
      console.error('Contact POST error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  app.get('/api/contact', async (req, res) => {
    try {
      await contactHandler(req, res);
    } catch (err) {
      console.error('Contact GET error:', err);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
  });

  // ✅ Health check now also reports DB status
  app.get('/health', (req, res) => res.json({ ok: true, db: 'connected' }));

  // ✅ 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  // ✅ Global error handler (catches anything thrown inside route handlers)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
}

startServer();
