import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#0f172a' }}>
          Study Smarter, Learn Faster
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem', maxWidth: 600, margin: '0 auto 2rem' }}>
          Transform your lecture notes into simplified PDFs and audio lessons powered by AI
        </p>
        <Link href="/signup">
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#1e40af' }}>
            Start Free Trial (30 Days)
          </button>
        </Link>
      </section>

      {/* Feature Cards */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Why Choose MindSpero?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'AI-Powered Simplification',
              description: 'Complex notes simplified in seconds using advanced AI technology'
            },
            {
              title: 'Multiple Formats',
              description: 'Get your notes as clean PDFs and MP3 audio files for on-the-go learning'
            },
            {
              title: 'Fast Processing',
              description: 'Most notes processed in under 5 minutes with instant downloads'
            },
            {
              title: 'Secure & Private',
              description: 'Your data is encrypted and stored securely on Supabase servers'
            },
            {
              title: 'Affordable Plans',
              description: 'Free trial + flexible monthly or annual subscription options'
            },
            {
              title: 'Always Available',
              description: '24/7 access to your processed notes anytime, anywhere'
            }
          ].map((feature, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <h3 style={{ marginTop: 0, fontSize: '1.25rem', color: '#1e40af' }}>
                {feature.title}
              </h3>
              <p style={{ color: '#64748b', marginBottom: 0 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '3rem 2rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {[
            { label: '100% Secure', value: 'Bank-level encryption' },
            { label: '<5 min Processing', value: 'Average speed' },
            { label: 'All File Formats', value: 'PDF, DOCX, TXT' },
            { label: '24/7 Support', value: 'Always here for you' }
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '0.5rem' }}>
                {stat.label}
              </div>
              <div style={{ color: '#64748b' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {[
            { step: '1', title: 'Sign Up Free', description: 'Create account and get 30 days free access' },
            { step: '2', title: 'Upload Notes', description: 'Upload PDF, DOCX, or TXT files' },
            { step: '3', title: 'AI Processing', description: 'Our AI simplifies and optimizes your content' },
            { step: '4', title: 'Download Results', description: 'Get PDF and audio versions instantly' }
          ].map((item, i) => (
            <div key={i} style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: '#1e40af',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 auto 1rem'
              }}>
                {item.step}
              </div>
              <h3 style={{ marginTop: 0, fontSize: '1.125rem' }}>{item.title}</h3>
              <p style={{ marginBottom: 0, color: '#64748b' }}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '3rem 2rem', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Ready to Transform Your Learning?</h2>
        <p style={{ fontSize: '1.125rem', color: '#64748b' }}>
          Start your free 30-day trial today. No credit card required.
        </p>
        <Link href="/signup">
          <button style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#1e40af' }}>
            Start Free Trial Now
          </button>
        </Link>
      </section>
    </div>
  );
}
