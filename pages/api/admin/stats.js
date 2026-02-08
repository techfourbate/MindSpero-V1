import supabaseAdmin from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Missing authorization token' });
    }

    try {
        // Verify the user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user is the admin
        if (user.email !== 'techfourbate@gmail.com') {
            return res.status(403).json({ error: 'Forbidden: Admin access only' });
        }

        // Fetch stats
        // 1. Total Users (using profiles table as proxy for users since we can't easily count auth.users without admin API listing all)
        const { count: userCount, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        // 2. Active Subscriptions
        const now = new Date().toISOString();
        const { count: activeSubsCount, error: subError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .or(`subscription_end_date.gt.${now},trial_end_date.gt.${now},bonus_trial_end_date.gt.${now}`);

        if (subError) throw subError;

        // 3. Total Notes Processed
        const { count: notesCount, error: notesError } = await supabaseAdmin
            .from('notes')
            .select('*', { count: 'exact', head: true });

        if (notesError) throw notesError;

        // 4. Recent Users (Last 5)
        const { data: recentUsers, error: recentUsersError } = await supabaseAdmin
            .from('profiles')
            .select('email, created_at, subscription_plan')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentUsersError) throw recentUsersError;

        return res.status(200).json({
            stats: {
                totalUsers: userCount,
                activeSubscriptions: activeSubsCount,
                totalNotes: notesCount,
            },
            recentUsers
        });

    } catch (err) {
        console.error('Admin stats error:', err);
        return res.status(500).json({ error: err.message });
    }
}
