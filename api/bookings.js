const { connect } = require('./db');
const Booking = require('../models/booking');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@32dentalavenue.com';
const FROM_EMAIL = process.env.FROM_EMAIL || `"32Dental Avenue" <no-reply@32dentalavenue.com>`;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, 
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Vercel serverless handler
const _cors = require('./_cors');
module.exports = async (req, res) => {
  // CORS: allow cross-origin requests (dev server on 127.0.0.1:5500 or any allowed origin)
  _cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    await connect(); // ensure DB is connected

    if (req.method === 'POST') {
      const { firstName, lastName, email, phone, location, date } = req.body || {};
      if (!firstName || !lastName || !email || !phone || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const bookingDate = new Date(date);
      if (isNaN(bookingDate.getTime())) return res.status(400).json({ error: 'Invalid booking date' });
      const newBooking = await Booking.create({ firstName, lastName, email, phone, location: location || '', bookingDate });

      // Send confirmation email to user (non-fatal - log errors but still return success)
      const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      if (smtpConfigured) {
        const transporter = createTransport();

        const userMail = {
          from: FROM_EMAIL,
          to: email,
          subject: 'Your booking is confirmed - 32Dental Avenue ✅',
          text: `Hi ${firstName},\n\nYour booking for ${bookingDate.toISOString()} at ${location || 'our clinic'} is confirmed.\n\nThanks,\n32Dental Avenue`,
          html: `<p>Hi <strong>${firstName}</strong>,</p><p>Your booking for <strong>${bookingDate.toISOString()}</strong> at <strong>${location || 'our clinic'}</strong> is confirmed.</p><p>Thanks,<br/>32Dental Avenue</p>`,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Precedence': 'bulk',
            'List-Unsubscribe': `<mailto:${ADMIN_EMAIL}?subject=unsubscribe>`,
          },
          replyTo: ADMIN_EMAIL,
        };

        try {
          await transporter.sendMail(userMail);
        } catch (err) {
          console.error('Failed to send user confirmation email', err && err.stack ? err.stack : err);
        }

        // Notify admin
        const adminMail = {
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: 'New booking received',
          text: `A new booking has been made by ${firstName} ${lastName} (${email}). Please contact them at ${phone}.`,
          headers: { 'X-Priority': '3' },
        };

        try {
          await transporter.sendMail(adminMail);
        } catch (err) {
          console.error('Failed to send admin notification email', err && err.stack ? err.stack : err);
        }
      } else {
        console.warn('SMTP not configured, skipped sending emails');
      }

      return res.status(201).json({ id: newBooking._id, message: 'Booking confirmed' });
    }

    if (req.method === 'GET') {
      // Admin-only route: check Authorization header
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      const token = auth.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (!payload || payload.role !== 'admin') throw new Error('Invalid token');
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const rows = await Booking.find().sort({ createdAt: -1 }).select('-__v');
      return res.json({ bookings: rows });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error('Bookings error', err && err.stack ? err.stack : err);
    const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err && err.message ? err.message : 'Internal server error');
    res.status(500).json({ error: msg });
  }
};