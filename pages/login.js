import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '2rem' }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
      }}>
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>Log In to Your Account</h2>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#7f1d1d',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading ? '#cbd5e1' : '#1e40af',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
              });
              if (error) {
                setError(error.message);
                setLoading(false);
              }
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'white',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: 20, height: 20 }} />
            Sign in with Google
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#1e40af', fontWeight: '600' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
