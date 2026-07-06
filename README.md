# TradeFlow — Full-Stack Crypto Trading Platform

A working full-stack trading platform scaffold: React/Next.js frontend, Node.js/Express backend, PostgreSQL database, JWT + 2FA auth, live market data and real order execution via the Binance API (Spot Testnet by default), wallet system, KYC pipeline, notifications, and an admin panel with RBAC.

This is a **vertical slice built for real use and extension** — not a mockup. Every endpoint reads/writes real database rows and the trading flow calls the real Binance API. What's *not* included out of the box: production compliance/legal setup, a background worker for pending limit/stop orders, and a payment gateway for fiat deposits — see "What's simulated vs. real" below.

---

## Project structure

```
tradeflow/
├── backend/                 # Node.js + Express API
│   ├── migrations/
│   │   └── schema.sql       # Full PostgreSQL schema
│   ├── src/
│   │   ├── config/db.js     # PostgreSQL connection pool
│   │   ├── controllers/     # Route handlers (auth, trade, wallet, kyc, admin, ...)
│   │   ├── middleware/      # JWT auth, RBAC, file upload
│   │   ├── models/          # SQL queries per table
│   │   ├── routes/          # Express routers
│   │   ├── services/        # binanceService, mailService, otpService
│   │   ├── utils/           # jwt helpers, migration runner, makeAdmin script
│   │   └── server.js        # App entrypoint
│   ├── .env.example
│   └── package.json
├── frontend/                 # Next.js app (pages router)
│   ├── pages/                # login, register, forgot-password, dashboard, trade
│   ├── components/Nav.js
│   ├── lib/api.js            # Typed fetch client
│   ├── styles/globals.css    # Design tokens
│   └── package.json
├── docker-compose.yml         # Local PostgreSQL
├── API_DOCUMENTATION.md
└── README.md
```

---

## Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) — or your own PostgreSQL 14+ instance
- A free [Binance Spot Testnet](https://testnet.binance.vision) API key (for real order execution in dev)

---

## 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with user/password/db all set to `tradeflow` (see `docker-compose.yml`).

## 2. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run migrate     # applies migrations/schema.sql
npm run dev          # starts on http://localhost:5000
```

Edit `.env` and set at minimum:
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random strings
- `BINANCE_API_KEY` / `BINANCE_API_SECRET` — get free testnet keys at https://testnet.binance.vision (login with GitHub, generate an HMAC key)
- SMTP / Twilio vars are optional in dev — if left blank, emails/SMS are logged to the console instead of sent, so registration and password reset still work for testing.

## 3. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # starts on http://localhost:3000
```

Visit `http://localhost:3000` → you'll land on `/login`. Register a new account, then log in.

## 4. Promote a user to admin (to access the admin API)

```bash
cd backend
node src/utils/makeAdmin.js you@example.com
```

The admin API is fully built (`/api/admin/*`, see API docs) — there is no separate admin frontend UI included in this slice yet; use the endpoints directly (Postman/curl) or ask to have an admin dashboard UI built next.

---

## What's simulated vs. real

| Feature | Status |
|---|---|
| Registration, login, JWT, bcrypt password hashing | **Real** |
| 2FA (TOTP via authenticator apps) | **Real** |
| Mobile OTP login | **Real** (via Twilio if configured; logs to console otherwise) |
| Live market prices (BTC/ETH/BNB/SOL) | **Real** — pulled live from Binance public API |
| Market order execution | **Real** — placed on Binance Spot Testnet by default (fake funds). Falls back to a simulated fill only if Binance execution errors, so the demo never breaks. |
| Limit / Stop-loss / Take-profit orders | Recorded as `pending` in the DB; **no background worker included yet** to monitor price and trigger them — a real system would add a scheduled job or use Binance's native `STOP_LOSS_LIMIT`/`TAKE_PROFIT_LIMIT` order types |
| Deposits / withdrawals | Requests are queued and require **admin approval** via `/api/admin/transactions/:id/review`; no payment gateway or blockchain deposit watcher is wired up |
| KYC | Real file upload + admin approve/reject flow; no automated ID-verification vendor integrated |
| Admin panel | Full API built and RBAC-protected; **no dedicated admin frontend pages yet** (functional slice prioritized user-facing app first) |

---

## Security notes for going to production

- Rotate all secrets in `.env`; never commit `.env` to git (already in `.gitignore`)
- Put the app behind HTTPS/SSL (e.g., via a reverse proxy like Nginx + Let's Encrypt, or your cloud provider's load balancer)
- Move the in-memory password-reset token store (`authController.js`) to a database table or Redis with TTL
- Add request validation/schema checks consistently (Zod is already used in several controllers — extend to all)
- Add a background job (e.g., BullMQ + Redis) to monitor and execute pending LIMIT/STOP_LOSS/TAKE_PROFIT orders
- Before enabling real-money trading: complete a security audit, and confirm KYC/AML compliance obligations with legal counsel for every jurisdiction you'll operate in
- Consider a Web Application Firewall and DDoS protection (Cloudflare, AWS WAF, etc.) in front of the API

## Deployment outline

- **Backend**: containerize with a `Dockerfile` (Node 18-alpine base), deploy to any container host (Render, Railway, ECS, Fly.io). Point `DATABASE_URL` at a managed PostgreSQL instance (RDS, Supabase, Neon).
- **Frontend**: deploy the Next.js app to Vercel, or containerize and deploy alongside the backend. Set `NEXT_PUBLIC_API_URL` to your backend's public URL.
- **File uploads** (KYC docs): swap the local `multer` disk storage for S3-compatible object storage in production.
