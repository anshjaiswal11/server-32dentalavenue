const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const { connect } = require('./api/db');
const bookingsHandler = require('./api/bookings');
const loginHandler = require('./api/login');
const blogsRouter = require('./api/blogs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Ensure DB connection
connect()
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error', err));

// Routes
app.post('/api/bookings', async (req, res) => {
  try {
    await bookingsHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    await bookingsHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    await loginHandler(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.use('/api/blogs', blogsRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
