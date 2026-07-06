import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Nav from '../components/Nav';
import { api } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
      router.replace('/login');
      return;
    }
    load();
    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const [overview, marketData] = await Promise.all([api.getDashboard(), api.getMarkets()]);
      setData(overview);
      setMarkets(marketData.markets);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMarkets() {
    try {
      const marketData = await api.getMarkets();
      setMarkets(marketData.markets);
    } catch {}
  }

  return (
    <div>
      <Nav />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 24 }}>Portfolio Overview</h1>

        {error && <div className="error-banner">{error}</div>}

        {data && (
          <>
            <div className="panel" style={{ marginBottom: 24 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Total portfolio value</div>
              <div className="mono" style={{ fontSize: 36, fontWeight: 600 }}>
                ${data.portfolioValueUsd.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
              <div className="panel">
                <h2 style={{ fontSize: 16, marginBottom: 16 }}>Holdings</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', textAlign: 'left', fontSize: 12 }}>
                      <th style={{ paddingBottom: 8 }}>Asset</th>
                      <th style={{ paddingBottom: 8 }}>Quantity</th>
                      <th style={{ paddingBottom: 8 }}>Price</th>
                      <th style={{ paddingBottom: 8, textAlign: 'right' }}>Value (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((h) => (
                      <tr key={h.asset} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 0', fontWeight: 600 }}>{h.asset}</td>
                        <td className="mono">{h.quantity.toFixed(6)}</td>
                        <td className="mono">{h.price ? `$${h.price.toLocaleString()}` : '—'}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {h.valueUsd !== null ? `$${h.valueUsd.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h2 style={{ fontSize: 16, marginBottom: 16 }}>Live Markets</h2>
                {markets.map((m) => (
                  <div key={m.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{m.symbol}</span>
                    <span className="mono">${m.lastPrice.toLocaleString()}</span>
                    <span className={`mono ${m.priceChangePercent >= 0 ? 'gain' : 'loss'}`}>
                      {m.priceChangePercent >= 0 ? '+' : ''}{m.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 16, marginBottom: 16 }}>Recent Orders</h2>
              {data.recentOrders.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No orders yet.</p>}
              {data.recentOrders.map((o) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 14 }}>
                  <span className={o.side === 'BUY' ? 'gain' : 'loss'} style={{ fontWeight: 600 }}>{o.side}</span>
                  <span>{o.symbol}</span>
                  <span className="mono">{o.quantity}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{o.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
