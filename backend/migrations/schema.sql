-- TradeFlow Database Schema (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret VARCHAR(255),
    kyc_status VARCHAR(20) DEFAULT 'not_submitted', -- not_submitted | pending | approved | rejected
    status VARCHAR(20) DEFAULT 'active', -- active | suspended | banned
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(10) NOT NULL, -- 'email' | 'sms'
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(30) NOT NULL, -- 'login' | 'signup' | 'password_reset'
    expires_at TIMESTAMPTZ NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset VARCHAR(10) NOT NULL, -- e.g. USDT, BTC, ETH
    balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
    locked_balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
    UNIQUE (user_id, asset),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- deposit | withdrawal
    asset VARCHAR(10) NOT NULL,
    amount NUMERIC(24, 8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | approved | rejected | completed
    reference VARCHAR(255),
    admin_note TEXT,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL, -- e.g. BTCUSDT
    side VARCHAR(4) NOT NULL, -- BUY | SELL
    order_type VARCHAR(20) NOT NULL, -- MARKET | LIMIT | STOP_LOSS | TAKE_PROFIT
    quantity NUMERIC(24, 8) NOT NULL,
    limit_price NUMERIC(24, 8),
    stop_price NUMERIC(24, 8),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | filled | cancelled | rejected
    exchange_order_id VARCHAR(100),
    filled_price NUMERIC(24, 8),
    filled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_type VARCHAR(30) NOT NULL, -- passport | national_id | drivers_license | proof_of_address
    file_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
    reviewed_by UUID REFERENCES users(id),
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info', -- info | warning | success | trade | kyc | wallet
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
