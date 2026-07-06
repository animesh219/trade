import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../lib/api';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register(form);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} className="panel" style={{ width: 400 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 4 }}>Create your account</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Start trading in minutes</p>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">Account created. Redirecting to login…</div>}

        <div style={{ marginBottom: 16 }}>
          <label>Full name</label>
          <input className="input" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Phone (optional, for SMS OTP login)</label>
          <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+1 555 000 0000" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={8} required />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
