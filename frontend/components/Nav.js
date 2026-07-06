import Link from 'next/link';
import { useRouter } from 'next/router';
import { clearSession, getCurrentUser } from '../lib/api';

export default function Nav() {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getCurrentUser() : null;

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/dashboard" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
          Trade<span style={{ color: 'var(--accent)' }}>Flow</span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 14 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/trade">Trade</Link>
          {user && <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>}
          <button className="btn btn-ghost" onClick={logout} style={{ padding: '8px 14px' }}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
