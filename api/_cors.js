module.exports = (req, res) => {
  // Determine request origin
  const origin = req && req.headers && req.headers.origin;

  // Allowed origins (add more as needed or move to env var)
  const allowedOrigins = [
    'https://www.32dentalavenue.in',
    'https://32dentalavenue.in',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Default to permissive for non-browser or unspecified origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
};