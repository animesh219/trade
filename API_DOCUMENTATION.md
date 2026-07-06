# TradeFlow API Documentation

Base URL: `http://localhost:5000/api`

All authenticated endpoints require a header:
```
Authorization: Bearer <accessToken>
```

---

## Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | `{ email, password, fullName, phone? }` → creates user + USDT wallet |
| POST | `/auth/login` | No | `{ email, password, twoFactorToken? }` → returns `{ accessToken, refreshToken, user }`, or `{ requiresTwoFactor: true }` if 2FA is enabled and no token was sent |
| POST | `/auth/refresh` | No | `{ refreshToken }` → new `accessToken` |
| POST | `/auth/forgot-password` | No | `{ email }` → emails a reset link (always 200, doesn't leak account existence) |
| POST | `/auth/reset-password` | No | `{ token, newPassword }` |
| GET | `/auth/me` | Yes | Returns current user profile |
| POST | `/auth/2fa/setup` | Yes | Returns `{ secret, qrCode }` (base32 secret + QR data URL for authenticator apps) |
| POST | `/auth/2fa/verify` | Yes | `{ token }` → verifies TOTP code and enables 2FA |
| POST | `/auth/otp/request` | No | `{ phone }` → sends SMS OTP for phone login |
| POST | `/auth/otp/verify` | No | `{ phone, code }` → returns tokens on success |

## Dashboard — `/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/overview` | Yes | Portfolio value, per-asset holdings (live-priced), 5 most recent orders |

## Trading — `/trade`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/trade/markets` | No | 24hr stats for BTC/ETH/BNB/SOL (USDT pairs), sourced live from Binance |
| GET | `/trade/markets/:symbol` | No | Latest price for a symbol, e.g. `BTCUSDT` |
| POST | `/trade/orders` | Yes | `{ symbol, side: BUY\|SELL, orderType: MARKET\|LIMIT\|STOP_LOSS\|TAKE_PROFIT, quantity, limitPrice?, stopPrice? }`. MARKET orders execute immediately against Binance (testnet by default); other types are recorded as pending. |
| GET | `/trade/orders` | Yes | Current user's order history |

## Wallet — `/wallet`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wallet` | Yes | List of wallet balances by asset |
| POST | `/wallet/deposit` | Yes | `{ asset, amount, reference? }` → creates a pending deposit request for admin review |
| POST | `/wallet/withdraw` | Yes | `{ asset, amount, destination }` → locks funds and creates a pending withdrawal request |
| GET | `/wallet/transactions` | Yes | Deposit/withdrawal history |

## KYC — `/kyc`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/kyc/documents` | Yes | `multipart/form-data`: `document` (file), `docType` (passport\|national_id\|drivers_license\|proof_of_address) |
| GET | `/kyc/documents` | Yes | Current user's submitted documents and statuses |

## Notifications — `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | Recent notifications |
| POST | `/notifications/:id/read` | Yes | Marks a notification as read |

## Profile — `/profile`

| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/profile` | Yes | `{ fullName?, phone? }` |
| POST | `/profile/change-password` | Yes | `{ currentPassword, newPassword }` |

## Admin — `/admin` (requires `role: admin`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/analytics` | User count, filled order count, total trading volume, pending KYC/tx counts |
| GET | `/admin/users?limit=&offset=` | List users |
| PUT | `/admin/users/:id/status` | `{ status: active\|suspended\|banned }` |
| GET | `/admin/kyc/pending` | List pending KYC documents |
| PUT | `/admin/kyc/:id/review` | `{ status: approved\|rejected, note?, userId }` |
| GET | `/admin/transactions/pending` | List pending deposits/withdrawals |
| PUT | `/admin/transactions/:id/review` | `{ status: approved\|rejected, note? }` — credits/releases funds accordingly |
| GET | `/admin/orders` | All users' orders |
| POST | `/admin/notifications/broadcast` | `{ title, message, type? }` → sends to all users |
| GET | `/admin/audit-logs` | Recent audit log entries |

---

## Error format

All errors return: `{ "error": "human readable message" }` with an appropriate HTTP status code (400, 401, 403, 404, 409, 502).

## Rate limiting

- Global: 120 requests/minute per IP
- `/auth/*`: 20 requests / 15 minutes per IP

## Notes on the Binance integration

- Market data (`/trade/markets`) is public and always live — no API key required.
- Order execution (`/trade/orders`) uses signed Binance requests and requires `BINANCE_API_KEY` / `BINANCE_API_SECRET` in `.env`. By default `BINANCE_BASE_URL` points at the **Binance Spot Testnet** (`https://testnet.binance.vision`), which uses fake funds — get free testnet keys at that URL.
- If Binance execution fails or credentials are missing, MARKET orders fall back to a simulated fill at the live fetched price, so the app still works end-to-end for demos. Remove this fallback before going live with real money.
- To go live with real trading: set `BINANCE_BASE_URL=https://api.binance.com`, use real API keys with trading permissions, and complete a security review first.
