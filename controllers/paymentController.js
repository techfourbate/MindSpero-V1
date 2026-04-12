const db = require('../config/db');
const axios = require('axios');
require('dotenv').config();

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

const initializePayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { plan } = req.body; // 'monthly' or 'yearly'
        
        const amount = plan === 'yearly' ? 100 : 10;
        const txRef = `tx-${userId}-${Date.now()}`;

        const [users] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        const email = users[0].email;

        await db.query('INSERT INTO payments (user_id, tx_ref, amount, status) VALUES (?, ?, ?, "pending")', [userId, txRef, amount]);

        // Paystack Initialize Request
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amount * 100, // Paystack amount is in kobo/cents
                reference: txRef,
                callback_url: "http://localhost:3000/dashboard.html?payment=verify"
            },
            {
                headers: {
                    Authorization: `Bearer ${paystackSecretKey}`
                }
            }
        );

        if (response.data.status) {
            res.status(200).json({ success: true, url: response.data.data.authorization_url });
        } else {
            res.status(400).json({ success: false, message: 'Could not initialize payment' });
        }

    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, message: 'Payment initialization error' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { reference } = req.query;

        // Verify with Paystack API
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`
            }
        });

        const data = response.data.data;

        if (data.status === 'success') {
            // Update db
            await db.query('UPDATE payments SET status = "successful" WHERE tx_ref = ?', [reference]);

            // amount comes back in kobo
            const daysToAdd = (data.amount / 100) >= 100 ? 365 : 30;
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);

            await db.query('UPDATE users SET subscription_status = "active", subscription_end = ? WHERE id = ?', [newEndDate, userId]);

            res.status(200).json({ success: true, message: 'Payment successful, subscription activated.' });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }

    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, message: 'Payment verification error' });
    }
};

module.exports = { initializePayment, verifyPayment };
