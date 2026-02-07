import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Subscribe() {
  const router = useRouter();
  const [plan, setPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError(data.message || 'Failed to initialize payment');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Choose Your Plan</h2>
        <p style={{ color: '#64748b' }}>
          Unlock unlimited note processing with MindSpero Pro
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#7f1d1d',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '2rem',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Monthly',
            value: 'monthly',
            price: '30',
            currency: 'GHS',
            period: '/month',
            features: [
              'Unlimited uploads',
              'AI simplification',
              'PDF generation',
              'Audio generation',
              'Priority support'
            ]
          },
          {
            name: 'Yearly',
            value: 'yearly',
            price: '300',
            currency: 'GHS',
            period: '/year',
            badge: 'Save 2 months',
            features: [
              'Everything in Monthly',
              'Extra storage',
              'Advanced analytics',
              'Email support',
              'Priority processing'
            ]
          }
        ].map(p => (
          <div
            key={p.value}
            onClick={() => setPlan(p.value)}
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: plan === p.value ? '2px solid #1e40af' : '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
          >
            {p.badge && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '20px',
                background: '#10b981',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {p.badge}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              borderLeft: '4px solid #1e40af',
              paddingLeft: '1rem'
            }}>
              <input
                type="radio"
                name="plan"
                value={p.value}
                checked={plan === p.value}
                onChange={(e) => setPlan(e.target.value)}
                style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label style={{ fontWeight: '600', fontSize: '1.125rem', cursor: 'pointer', flex: 1 }}>
                {p.name}
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
                {p.currency} {p.price}
                <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>{p.period}</span>
              </div>
            </div>

            <ul style={{ paddingLeft: '1.75rem', margin: 0, marginBottom: '1.5rem', color: '#64748b' }}>
              {p.features.map((f, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            background: loading ? '#cbd5e1' : '#1e40af',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : `Continue to Payment (GHS ${plan === 'yearly' ? 300 : 30})`}
        </button>
        <p style={{ marginTop: '1.5rem', color: '#64748b' }}>
          Secure payment powered by Paystack. Your data is encrypted and safe.
        </p>
      </div>
    </div>
  );
}
