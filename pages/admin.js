import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, activeSubscriptions: 0, totalNotes: 0 });
    const [recentUsers, setRecentUsers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user || session.user.email !== 'techfourbate@gmail.com') {
                router.push('/dashboard');
                return;
            }

            try {
                const res = await fetch('/api/admin/stats', {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`
                    }
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Failed to load stats');
                }

                const data = await res.json();
                setStats(data.stats);
                setRecentUsers(data.recentUsers || []);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading Admin Dashboard...</div>;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ marginBottom: '2rem', color: '#1e40af' }}>Admin Dashboard</h1>
            {error && <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '2rem'
            }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="#3b82f6" />
                <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon="⭐" color="#eab308" />
                <StatCard title="Total Notes Processed" value={stats.totalNotes} icon="📝" color="#10b981" />
                <StatCard title="Est. Revenue (Monthly)" value={`GHS ${stats.activeSubscriptions * 30}`} icon="💰" color="#6366f1" />
            </div>

            <h2 style={{ marginBottom: '1rem' }}>Recent Signups</h2>
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Plan</th>
                            <th style={thStyle}>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentUsers.map((u, i) => (
                            <tr key={i} style={{ borderTop: i ? '1px solid #e2e8f0' : 'none' }}>
                                <td style={tdStyle}>{u.email}</td>
                                <td style={tdStyle}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '12px',
                                        background: u.subscription_plan ? '#dbeafe' : '#f1f5f9',
                                        color: u.subscription_plan ? '#1e40af' : '#64748b',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        {u.subscription_plan || 'TRIAL'}
                                    </span>
                                </td>
                                <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {recentUsers.length === 0 && <tr><td colSpan="3" style={{ ...tdStyle, textAlign: 'center' }}>No recent users found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const StatCard = ({ title, value, icon, color }) => (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            fontSize: '2rem',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${color}20`,
            borderRadius: '12px',
            color: color
        }}>{icon}</div>
        <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: '500' }}>{title}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', lineHeight: '1.2' }}>{value}</div>
        </div>
    </div>
);

const thStyle = { textAlign: 'left', padding: '1rem', fontSize: '0.875rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '1rem', fontSize: '0.9rem', color: '#334155' };
