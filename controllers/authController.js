const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        const hashed = await bcrypt.hash(password, 10);
        // Add 7 days trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);

        const [result] = await db.query(
            "INSERT INTO users (email, password, subscription_status, subscription_end) VALUES (?, ?, 'trial', ?)", 
            [email, hashed, trialEnd]
        );

        res.status(201).json({ success: true, message: 'User registered successfully. Trial activated for 7 days.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if admin
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.status(200).json({ success: true, token, role: 'admin' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, 
                email: user.email, 
                status: user.subscription_status,
                trial_start: user.trial_start,
                subscription_end: user.subscription_end
            } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Simple endpoint to get current user info
const me = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, email, trial_start, subscription_status, subscription_end FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        let user = users[0];
        // Check if trial is expired
        if (user.subscription_status === 'trial' && new Date(user.subscription_end) < new Date()) {
            await db.query("UPDATE users SET subscription_status = 'expired' WHERE id = ?", [user.id]);
            user.subscription_status = 'expired';
        }
        
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { register, login, me };
