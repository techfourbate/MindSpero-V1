const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'User already exists' });

        const hashed = await bcrypt.hash(password, 10);
        // Add 30 days trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const [result] = await db.query(
            "INSERT INTO users (email, password, subscription_status, subscription_end, verification_token, is_verified) VALUES (?, ?, 'trial', ?, ?, false)", 
            [email, hashed, trialEnd, verificationToken]
        );

        const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
        await sendEmail(
            email,
            'MindSpero - Verify Your Email',
            `<p>Thank you for registering at MindSpero. Please verify your email by clicking the link below:</p>
             <a href="${verifyUrl}">Verify Email</a>`
        );

        res.status(201).json({ success: true, message: 'User registered successfully. Please check your email to verify your account.' });
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
        
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email before logging in.' });
        }

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
        const [users] = await db.query('SELECT id, email, trial_start, subscription_status, subscription_end, subscription_plan FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        let user = users[0];
        // Check if subscription has expired
        if (user.subscription_end && new Date(user.subscription_end) < new Date() && user.subscription_status !== 'expired') {
            await db.query("UPDATE users SET subscription_status = 'expired' WHERE id = ?", [user.id]);
            user.subscription_status = 'expired';
        }
        
        const [uploads] = await db.query('SELECT COUNT(*) as count FROM uploads WHERE user_id = ?', [req.userId]);
        user.uploads_count = uploads[0].count;
        
        res.status(200).json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const [users] = await db.query('SELECT id FROM users WHERE verification_token = ?', [token]);
        if (users.length === 0) return res.status(400).send('Invalid or expired verification token. Please register again if needed.');
        
        await db.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = ?', [users[0].id]);
        res.redirect('/login.html?verified=true');
    } catch(err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User with that email does not exist' });
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        
        await db.query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [resetToken, resetTokenExpiry, users[0].id]);
        
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        await sendEmail(
            email,
            'MindSpero - Password Reset',
            `<p>You requested a password reset at MindSpero. Click the link below to set a new password:</p>
             <a href="${resetUrl}">Reset Password</a>
             <p>If you did not request a password reset, please ignore this email.</p>`
        );
        
        res.status(200).json({ success: true, message: 'Password reset link sent to your email.' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ message: 'Token and new password required' });
        
        const [users] = await db.query('SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()', [token]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid or expired reset token' });
        
        const hashed = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [hashed, users[0].id]);
        
        res.status(200).json({ success: true, message: 'Password reset successful. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password required' });
        
        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.userId]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const match = await bcrypt.compare(currentPassword, users[0].password);
        if (!match) return res.status(400).json({ message: 'Incorrect current password' });
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId]);
        
        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, me, verifyEmail, forgotPassword, resetPassword, updatePassword };
