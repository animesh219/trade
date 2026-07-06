import { useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="panel" style={{ width: 380 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>Reset your password</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          We'll email you a link to reset it.
        </p>

        {error && <div className="error-banner">{error}</div>}
        {sent && <div className="success-banner">If that email exists, a reset link has been sent.</div>}

        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }}>Send reset link</button>

        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          <Link href="/login" style={{ color: 'var(--accent)' }}>Back to log in</Link>
        </p>
      </form>
    </div>
  );
}
