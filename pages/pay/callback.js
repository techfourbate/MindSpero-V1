import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PaymentCallback() {
  const router = useRouter();
  const { reference } = router.query;
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    if (!reference) return;

    (async () => {
      try {
        const res = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('Payment successful! Your subscription is now active.');
          setTimeout(() => router.push('/dashboard'), 3000);
        } else {
          setStatus('failed');
          setMessage(data.message || 'Payment verification failed. Please try again.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('An error occurred. Please try again.');
      }
    })();
  }, [reference, router]);

  const bgColor = status === 'success' ? '#d1fae5' : status === 'failed' ? '#fee2e2' : '#f0f9ff';
  const borderColor = status === 'success' ? '#10b981' : status === 'failed' ? '#ef4444' : '#1e40af';
  const textColor = status === 'success' ? '#065f46' : status === 'failed' ? '#7f1d1d' : '#1e3a8a';

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
          {status === 'verifying' && '⏳'}
          {status === 'success' && '✓'}
          {status === 'failed' && '✗'}
        </div>

        <div style={{ background: bgColor, padding: '1.5rem', borderRadius: '6px', border: `2px solid ${borderColor}`, marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: textColor, marginBottom: '0.5rem' }}>
            {status === 'verifying' && 'Verifying Payment'}
            {status === 'success' && 'Payment Successful'}
            {status === 'failed' && 'Payment Failed'}
          </div>
          <div style={{ color: textColor, fontSize: '0.95rem' }}>{message}</div>
        </div>

        {status === 'success' && (
          <div style={{ marginBottom: '2rem', textAlign: 'left', background: '#f9fafb', padding: '1.5rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>What's next?</div>
            <ul style={{ paddingLeft: '1.75rem', margin: 0, color: '#64748b', lineHeight: '1.7' }}>
              <li>Your account has been upgraded</li>
              <li>You can now upload unlimited lecture notes</li>
              <li>All features are unlocked immediately</li>
              <li>Visit your dashboard to get started</li>
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/dashboard" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.75rem 2rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
            Go to Dashboard
          </a>
          {status === 'failed' && (
            <a href="/subscribe" style={{ display: 'inline-block', background: '#64748b', color: 'white', padding: '0.75rem 2rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
              Try Again
            </a>
          )}
        </div>

        {status === 'verifying' && (
          <div style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
            Please wait. Do not close this page.
          </div>
        )}
      </div>
    </div>
  );
}
