/**
 * Binance integration service.
 *
 * Defaults to Binance SPOT TESTNET (https://testnet.binance.vision) so the
 * platform can be developed and demoed safely with fake funds. To go live,
 * change BINANCE_BASE_URL to https://api.binance.com and use real API keys
 * -- only do this once KYC/AML, compliance, and security review are in place.
 */
const crypto = require('crypto');

const BASE_URL = process.env.BINANCE_BASE_URL || 'https://testnet.binance.vision';
const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;

function sign(queryString) {
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

async function publicRequest(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance public request failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function signedRequest(path, params = {}, method = 'GET') {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Binance API credentials are not configured');
  }
  const timestamp = Date.now();
  const fullParams = { ...params, timestamp, recvWindow: 5000 };
  const qs = new URLSearchParams(fullParams).toString();
  const signature = sign(qs);
  const url = `${BASE_URL}${path}?${qs}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': API_KEY },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance signed request failed (${res.status}): ${body}`);
  }
  return res.json();
}

/** Get the latest price for a symbol, e.g. BTCUSDT */
async function getPrice(symbol) {
  const data = await publicRequest('/api/v3/ticker/price', { symbol });
  return { symbol: data.symbol, price: parseFloat(data.price) };
}

/** Get 24hr ticker stats (price change, volume, high/low) for a symbol */
async function get24hrStats(symbol) {
  const data = await publicRequest('/api/v3/ticker/24hr', { symbol });
  return {
    symbol: data.symbol,
    lastPrice: parseFloat(data.lastPrice),
    priceChangePercent: parseFloat(data.priceChangePercent),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
  };
}

/** Get prices for a fixed watchlist of symbols, used on the dashboard */
async function getWatchlist(symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']) {
  const results = await Promise.all(symbols.map((s) => get24hrStats(s)));
  return results;
}

/**
 * Place a real order on Binance (testnet by default).
 * type: 'MARKET' | 'LIMIT'
 * side: 'BUY' | 'SELL'
 */
async function placeOrder({ symbol, side, type, quantity, price, timeInForce = 'GTC' }) {
  const params = { symbol, side, type, quantity };
  if (type === 'LIMIT') {
    params.price = price;
    params.timeInForce = timeInForce;
  }
  return signedRequest('/api/v3/order', params, 'POST');
}

/** Get account balances from Binance (requires signed request) */
async function getAccountBalances() {
  const data = await signedRequest('/api/v3/account');
  return data.balances.filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
}

module.exports = {
  getPrice,
  get24hrStats,
  getWatchlist,
  placeOrder,
  getAccountBalances,
};
