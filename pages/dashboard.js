import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      const userObj = u?.data?.user;
      setUser(userObj);
      if (userObj) {
        const { data } = await supabase.from('notes').select('*').eq('user_id', userObj.id).order('created_at', { ascending: false });
        setNotes(data || []);
        const { data: p } = await supabase.from('profiles').select('*').eq('id', userObj.id).single().maybeSingle();
        setProfile(p || null);
      }
      setLoading(false);
    })();
  }, []);

  const getAccessStatus = (profile) => {
    if (!profile) return { status: 'Unknown', color: '#64748b' };
    const now = new Date();
    const trial = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
    const bonus = profile.bonus_trial_end_date ? new Date(profile.bonus_trial_end_date) : null;
    const sub = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;

    if (trial && now <= trial) return { status: 'Free Trial Active', color: '#16a34a' };
    if (bonus && now <= bonus) return { status: 'Bonus Trial Active', color: '#f59e0b' };
    if (sub && now <= sub) return { status: 'Subscribed', color: '#1e40af' };
    return { status: 'Access Expired', color: '#dc2626' };
  };

  const accStatus = getAccessStatus(profile);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h2>Dashboard</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : (
        <>
          {/* Welcome Section */}
          {user && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
              <h3 style={{ marginTop: 0, color: '#1e293b' }}>Welcome back, {user.email}</h3>
              <p style={{ color: '#64748b' }}>Manage your notes and subscription below.</p>
            </div>
          )}

          {/* Subscription Status */}
          {profile && (
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem', borderLeft: '4px solid', borderLeftColor: accStatus.color }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Status</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: accStatus.color }}>
                    {accStatus.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Plan</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                    {profile.subscription_plan === 'yearly' ? 'Yearly' : profile.subscription_plan === 'monthly' ? 'Monthly' : 'Trial'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Access Expires</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                    {profile.trial_end_date && new Date(profile.trial_end_date) > new Date() ? new Date(profile.trial_end_date).toLocaleDateString() : profile.bonus_trial_end_date && new Date(profile.bonus_trial_end_date) > new Date() ? new Date(profile.bonus_trial_end_date).toLocaleDateString() : profile.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
              <a href="/subscribe" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
                Manage Subscription
              </a>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Your Notes ({notes.length})</h3>
              <a href="/upload" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                Upload New
              </a>
            </div>

            {notes.length === 0 ? (
              <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '2rem' }}>
                <p style={{ color: '#64748b', marginBottom: '1rem' }}>No notes yet. Start by uploading your first lecture notes.</p>
                <a href="/upload" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}>
                  Upload Notes
                </a>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {notes.map(n => (
                  <div key={n.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>{n.original_path.split('/').pop()}</div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        Status: <span style={{ fontWeight: '600', color: n.status === 'completed' ? '#16a34a' : '#f59e0b' }}>
                          {n.status === 'completed' ? 'Ready' : 'Processing'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {n.output_pdf_path && (
                        <a href={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]}/storage/v1/object/public/outputs/${n.output_pdf_path.split('outputs/')[1]}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
                          PDF
                        </a>
                      )}
                      {n.audio_path && (
                        <a href={`https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]}/storage/v1/object/public/outputs/${n.audio_path.split('outputs/')[1]}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: '600', fontSize: '0.85rem', textDecoration: 'none' }}>
                          Audio
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
