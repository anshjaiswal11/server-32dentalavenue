# 32Dental Avenue - Bookings API (serverless)

This project provides a serverless API (Vercel) to accept bookings, store them in MongoDB (Atlas recommended), and send confirmation emails to users and notifications to an admin.

## Quick setup
1. Copy `.env.example` to `.env` (for local testing) and fill values (set `MONGODB_URI` for Atlas or local Mongo).
2. Deploy to Vercel and set the environment variables in the Vercel dashboard (do not commit secrets).

## Endpoints
- POST `/api/bookings` - Accepts booking data and sends emails.
- GET `/api/bookings` - Admin protected, returns bookings (requires Bearer token).
- POST `/api/login` - Login with demo admin credentials, returns a JWT token.

## Admin panel & demo
- `/admin` route serves a simple demo admin panel. Demo credentials by default:
  - Email: `demo@admin`
  - Password: `demo1234`

- `/book` route serves a small booking form demo.

## Migrations
Run locally to ensure indexes are created:

  npm install
  npm run migrate

You can also run the project directly with Node.js for local development:

- Start: `npm start` (runs `node server.js`)
- Dev (auto-reload): `npm run dev` (requires `nodemon`)

`server.js` is an Express wrapper that serves static pages and exposes API routes locally for easier development.

## Email headers & deliverability
The emails contain a few helpful headers (List-Unsubscribe, X-Priority, Precedence). For best deliverability, set proper SPF/DKIM/DMARC records for your sending domain and use a reliable SMTP provider (e.g., SendGrid, SES, Mailgun).

## Notes
- Replace `JWT_SECRET` with a strong random value in production.
- For production admin and users, consider a proper auth system and HTTPS.

