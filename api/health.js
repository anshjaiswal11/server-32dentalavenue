const _cors = require('./_cors');

module.exports = (req, res) => {
  _cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') return res.status(200).json({ status: 'ok', message: 'Server is running 🚀' });
  return res.status(405).end('Method Not Allowed');
};
