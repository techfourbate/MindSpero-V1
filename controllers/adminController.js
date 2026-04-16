const jwt = require('jsonwebtoken');
const db = require('../config/db');

const adminLogin = (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
};

const getStats = async (req, res) => {
    try {
        if (req.userRole !== 'admin') return res.status(403).send('Forbidden');
        
        const [users] = await db.query('SELECT COUNT(*) as count FROM users');
        const [monthly] = await db.query('SELECT COUNT(*) as count FROM users WHERE (subscription_plan="monthly" OR (subscription_status="active" AND subscription_plan="trial")) AND subscription_status="active" AND subscription_end > NOW()');
        const [yearly] = await db.query('SELECT COUNT(*) as count FROM users WHERE subscription_plan="yearly" AND subscription_status="active" AND subscription_end > NOW()');
        const [trials] = await db.query('SELECT COUNT(*) as count FROM users WHERE subscription_status="trial" AND subscription_end > NOW()');
        const [uploads] = await db.query('SELECT COUNT(*) as count FROM uploads');
        const [payments] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status="successful"');
        
        const [recentUsers] = await db.query('SELECT id, email, subscription_status as status, subscription_plan as plan, subscription_end, created_at FROM users ORDER BY created_at DESC');

        const now = new Date();
        recentUsers.forEach(u => {
            // Check expiry
            if (u.subscription_end && new Date(u.subscription_end) < now && u.status !== 'expired') {
                u.status = 'expired';
                db.query("UPDATE users SET subscription_status = 'expired' WHERE id = ?", [u.id]).catch(console.error);
            }
            // Fallback for older active users whose plan is still marked as 'trial'
            if (u.status === 'active' && (!u.plan || u.plan === 'trial')) {
                u.plan = 'monthly';
            }
        });

        const [recentPayments] = await db.query('SELECT p.id, u.email, p.tx_ref, p.amount, p.currency, p.status, p.created_at FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT 50');

        res.json({
            success: true,
            stats: {
                users: users[0].count,
                monthly: monthly[0].count,
                yearly: yearly[0].count,
                trials: trials[0].count,
                uploads: uploads[0].count,
                revenue: payments[0].total || 0
            },
            recentUsers,
            recentPayments
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

module.exports = { adminLogin, getStats };
