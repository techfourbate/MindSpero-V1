import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>MindSpero</span>
      </Link>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500', borderBottom: router.pathname === '/' ? '2px solid #1e40af' : 'none' }}>
          Home
        </Link>

        {user ? (
          <>
            {user.email === 'techfourbate@gmail.com' && (
              <Link href="/admin" style={{ textDecoration: 'none', color: '#dc2626', fontWeight: '600', borderBottom: router.pathname === '/admin' ? '2px solid #dc2626' : 'none' }}>
                Admin
              </Link>
            )}
            <Link href="/upload" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500', borderBottom: router.pathname === '/upload' ? '2px solid #1e40af' : 'none' }}>
              Upload
            </Link>
            <Link href="/dashboard" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500', borderBottom: router.pathname === '/dashboard' ? '2px solid #1e40af' : 'none' }}>
              Dashboard
            </Link>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '500', cursor: 'pointer' }}>
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href="/signup" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500', borderBottom: router.pathname === '/signup' ? '2px solid #1e40af' : 'none' }}>
              Sign Up
            </Link>
            <Link href="/login" style={{ textDecoration: 'none', color: '#64748b', fontWeight: '500', borderBottom: router.pathname === '/login' ? '2px solid #1e40af' : 'none' }}>
              Log In
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
