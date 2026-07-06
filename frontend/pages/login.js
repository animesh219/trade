import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api, saveSession } from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { email, password };
      if (needsTwoFactor) payload.twoFactorToken = twoFactorToken;
      const res = await api.login(payload);
      if (res.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setLoading(false);
        return;
      }
      saveSession(res);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="panel" style={{ width: 380 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 4 }}>
          Trade<span style={{ color: 'var(--accent)' }}>Flow</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Log in to your account</p>

        {error && <div className="error-banner">{error}</div>}

        {!needsTwoFactor ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label>Enter your 2FA code</label>
            <input className="input mono" value={twoFactorToken} onChange={(e) => setTwoFactorToken(e.target.value)} maxLength={6} required />
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Please wait…' : needsTwoFactor ? 'Verify & log in' : 'Log in'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13 }}>
          <Link href="/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot password?</Link>
          <Link href="/register" style={{ color: 'var(--accent)' }}>Create account</Link>
        </div>
      </form>
    </div>
  );
}
