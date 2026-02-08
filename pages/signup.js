import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        const res = await fetch('/api/createProfile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, email }),
        });

        if (res.ok) {
          setError('');
          setTimeout(() => router.push('/dashboard'), 1000);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || 'Failed to create profile. Please contact support.');
        }
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
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>Create Your Account</h2>
        <p style={{ textAlign: 'center', color: '#64748b' }}>
          Get 30 days free trial. No credit card required.
        </p>

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

        <form onSubmit={handleSignup}>
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
              placeholder="Min 6 characters"
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1e40af', fontWeight: '600' }}>
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
