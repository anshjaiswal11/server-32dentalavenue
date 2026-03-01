const _cors = require('./_cors');
const { connect } = require('./db');

module.exports = async (req, res) => {
  _cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  try {
    await connect();
    return res.json({ ok: true, message: 'Connected to MongoDB' });
  } catch (err) {
    // Log full error to function logs, but return a helpful message to the client
    console.error('DB-check failed', err && err.stack ? err.stack : err);
    return res.status(503).json({ ok: false, error: err.message || 'Connection failed' });
  }
};