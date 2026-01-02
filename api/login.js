const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Demo credentials (change for prod)
const DEMO_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo@admin';
const DEMO_PASSWORD = process.env.DEMO_ADMIN_PASS || 'demo1234';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, expiresIn: 8 * 3600 });
  }

  res.status(401).json({ error: 'Invalid credentials' });
};