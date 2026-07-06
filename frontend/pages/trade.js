import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Nav from '../components/Nav';
import { api } from '../lib/api';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

export default function Trade() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('MARKET');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [markets, setMarkets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      router.replace('/login');
      return;
    }
    loadMarkets();
    loadOrders();
    const interval = setInterval(loadMarkets, 8000);
    return () => clearInterval(interval);
  }, []);

  async function loadMarkets() {
    try {
      const { markets } = await api.getMarkets();
      setMarkets(markets);
    } catch {}
  }

  async function loadOrders() {
    try {
      const { orders } = await api.getMyOrders();
      setOrders(orders);
    } catch {}
  }

  const currentPrice = markets.find((m) => m.symbol === symbol)?.lastPrice;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        symbol,
        side,
        orderType,
        quantity: parseFloat(quantity),
      };
      if (orderType === 'LIMIT') payload.limitPrice = parseFloat(limitPrice);
      if (orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT') payload.stopPrice = parseFloat(stopPrice);

      const res = await api.placeOrder(payload);
      setSuccess(res.message || `Order ${res.order.status}`);
      setQuantity('');
      loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Nav />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 24 }}>Trade</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
          <div className="panel">
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Place order</h2>

            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label>Symbol</label>
                <select className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                  {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {currentPrice && (
                  <div className="mono" style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Market price: ${currentPrice.toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button type="button" className="btn" style={{ flex: 1, background: side === 'BUY' ? 'var(--gain)' : 'var(--bg)', color: side === 'BUY' ? '#06251a' : 'var(--text-primary)', border: '1px solid var(--border)' }} onClick={() => setSide('BUY')}>Buy</button>
                <button type="button" className="btn" style={{ flex: 1, background: side === 'SELL' ? 'var(--loss)' : 'var(--bg)', color: side === 'SELL' ? '#2b0509' : 'var(--text-primary)', border: '1px solid var(--border)' }} onClick={() => setSide('SELL')}>Sell</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>Order type</label>
                <select className="input" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP_LOSS">Stop loss</option>
                  <option value="TAKE_PROFIT">Take profit</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>Quantity</label>
                <input className="input" type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>

              {orderType === 'LIMIT' && (
                <div style={{ marginBottom: 14 }}>
                  <label>Limit price (USDT)</label>
                  <input className="input" type="number" step="any" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} required />
                </div>
              )}

              {(orderType === 'STOP_LOSS' || orderType === 'TAKE_PROFIT') && (
                <div style={{ marginBottom: 14 }}>
                  <label>Trigger price (USDT)</label>
                  <input className="input" type="number" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} required />
                </div>
              )}

              <button className={`btn ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`} style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Placing order…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${symbol.replace('USDT', '')}`}
              </button>
            </form>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Order history</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ paddingBottom: 8 }}>Symbol</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Fill price</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0' }}>{o.symbol}</td>
                    <td className={o.side === 'BUY' ? 'gain' : 'loss'}>{o.side}</td>
                    <td>{o.order_type}</td>
                    <td className="mono">{o.quantity}</td>
                    <td className="mono">{o.filled_price ? `$${o.filled_price}` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{o.status}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '16px 0', color: 'var(--text-secondary)' }}>No orders placed yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
