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
        const [uploads] = await db.query('SELECT COUNT(*) as count FROM uploads');
        const [payments] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status="successful"');
        
        const [recentUsers] = await db.query('SELECT id, email, subscription_status as status, created_at FROM users ORDER BY created_at DESC LIMIT 10');

        res.json({
            success: true,
            stats: {
                users: users[0].count,
                uploads: uploads[0].count,
                revenue: payments[0].total || 0
            },
            recentUsers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

module.exports = { adminLogin, getStats };
