const { connect } = require('./db');
const Contact = require('../models/contact');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const _cors = require('./_cors');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@32dentalavenue.com';
const FROM_EMAIL  = process.env.FROM_EMAIL  || `"32Dental Avenue" <no-reply@32dentalavenue.com>`;
const JWT_SECRET  = process.env.JWT_SECRET  || 'change_this_secret';

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Vercel serverless / Express handler
module.exports = async (req, res) => {
  _cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // Ensure DB is connected
    try {
      await connect();
    } catch (err) {
      console.error('DB connection failed', err && err.stack ? err.stack : err);
      const dbMsg = process.env.NODE_ENV === 'production'
        ? 'Database unavailable'
        : (err && err.message ? err.message : 'Database connection failed');
      return res.status(503).json({ error: dbMsg });
    }

    // ──────────────────────────────────────────────
    // POST /api/contact — submit a contact-us form
    // ──────────────────────────────────────────────
    if (req.method === 'POST') {
      const { firstName, lastName, email, phone, location, message } = req.body || {};

      if (!firstName || !lastName || !email || !phone || !message) {
        return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, phone, message' });
      }

      let newContact;
      try {
        newContact = await Contact.create({
          firstName,
          lastName,
          email,
          phone,
          location: location || '',
          message,
        });
      } catch (err) {
        console.error('DB write failed', err && err.stack ? err.stack : err);
        const dbMsg = process.env.NODE_ENV === 'production'
          ? 'Database write failed'
          : (err && err.message ? err.message : 'Database write failed');
        return res.status(503).json({ error: dbMsg });
      }

      // Send emails (non-fatal)
      const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
      if (smtpConfigured) {
        const transporter = createTransport();

        // Confirmation to the user
        try {
          await transporter.sendMail({
            from:    FROM_EMAIL,
            to:      email,
            subject: 'We received your message – 32Dental Avenue ✅',
            text:    `Hi ${firstName},\n\nThank you for reaching out! We have received your message and will get back to you shortly.\n\nThanks,\n32Dental Avenue`,
            html:    `<p>Hi <strong>${firstName}</strong>,</p><p>Thank you for reaching out! We have received your message and will get back to you shortly.</p><p>Thanks,<br/>32Dental Avenue</p>`,
            headers: {
              'X-Priority':       '3',
              'X-MSMail-Priority':'Normal',
              'Precedence':       'bulk',
              'List-Unsubscribe': `<mailto:${ADMIN_EMAIL}?subject=unsubscribe>`,
            },
            replyTo: ADMIN_EMAIL,
          });
        } catch (err) {
          console.error('Failed to send user acknowledgement email', err && err.stack ? err.stack : err);
        }

        // Notification to admin
        try {
          await transporter.sendMail({
            from:    FROM_EMAIL,
            to:      ADMIN_EMAIL,
            subject: 'New Contact-Us message received',
            text:    `A new contact-us message has been submitted.\n\nName:     ${firstName} ${lastName}\nEmail:    ${email}\nPhone:    ${phone}\nLocation: ${location || '—'}\n\nMessage:\n${message}`,
            html:    `<p><strong>New contact-us message received.</strong></p>
                      <table>
                        <tr><td><b>Name</b></td><td>${firstName} ${lastName}</td></tr>
                        <tr><td><b>Email</b></td><td>${email}</td></tr>
                        <tr><td><b>Phone</b></td><td>${phone}</td></tr>
                        <tr><td><b>Location</b></td><td>${location || '—'}</td></tr>
                      </table>
                      <p><b>Message:</b><br/>${message.replace(/\n/g, '<br/>')}</p>`,
            headers: { 'X-Priority': '3' },
          });
        } catch (err) {
          console.error('Failed to send admin notification email', err && err.stack ? err.stack : err);
        }
      } else {
        console.warn('SMTP not configured, skipped sending emails');
      }

      return res.status(201).json({ id: newContact._id, message: 'Message received, we will be in touch soon!' });
    }

    // ──────────────────────────────────────────────────────────────
    // GET /api/contact — admin only, returns all contact submissions
    // ──────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = auth.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (!payload || payload.role !== 'admin') throw new Error('Invalid token');
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const contacts = await Contact.find().sort({ createdAt: -1 }).select('-__v');
      return res.json({ contacts });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).end('Method Not Allowed');

  } catch (err) {
    console.error('Contact error', err && err.stack ? err.stack : err);
    const msg = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err && err.message ? err.message : 'Internal server error');
    return res.status(500).json({ error: msg });
  }
};
