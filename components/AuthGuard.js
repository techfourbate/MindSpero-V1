import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabaseClient';

const protectedRoutes = ['/dashboard', '/upload', '/subscribe'];

export default function AuthGuard({ children }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        let mounted = true;

        // Get initial session
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(session);
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Check route protection whenever session or path changes
    useEffect(() => {
        if (!loading && !session && protectedRoutes.includes(router.pathname)) {
            router.push('/login');
        }
    }, [session, loading, router.pathname]);

    if (loading) {
        // Show a loading spinner or minimal layout while checking auth
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ color: '#64748b' }}>Checking access...</div>
            </div>
        );
    }

    // If on a protected route and not authenticated, don't render content (the useEffect above handles redirect)
    if (!session && protectedRoutes.includes(router.pathname)) {
        return null;
    }

    return children;
}
