const db = require('../config/db');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

const initializePayment = async (req, res) => {
    try {
        const userId = req.userId;
        const { plan } = req.body; // 'monthly' or 'yearly'
        
        const amount = plan === 'yearly' ? 300 : 30;
        const txRef = `tx-${userId}-${Date.now()}`;

        const [users] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
        const email = users[0].email;

        await db.query('INSERT INTO payments (user_id, tx_ref, amount, status) VALUES (?, ?, ?, "pending")', [userId, txRef, amount]);

        // Paystack Initialize Request
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amount * 100, // Paystack amount is in kobo/cents/pesewas
                currency: "GHS",
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
            const [existingPayment] = await db.query('SELECT status FROM payments WHERE tx_ref = ?', [reference]);
            
            // Check if already processed by webhook
            if (existingPayment.length > 0 && existingPayment[0].status === 'successful') {
                return res.status(200).json({ success: true, message: 'Payment successfully processed.' });
            }

            // Update db
            await db.query('UPDATE payments SET status = "successful" WHERE tx_ref = ?', [reference]);

            // amount comes back in kobo
            const daysToAdd = (data.amount / 100) >= 100 ? 365 : 30;
            const planName = daysToAdd === 365 ? 'yearly' : 'monthly';
            
            const [users] = await db.query('SELECT subscription_end FROM users WHERE id = ?', [userId]);
            const currentEndDate = users.length > 0 && users[0].subscription_end ? new Date(users[0].subscription_end) : new Date();
            
            let newEndDate = new Date();
            if (currentEndDate > new Date()) {
                newEndDate = new Date(currentEndDate);
            }
            newEndDate.setDate(newEndDate.getDate() + daysToAdd);

            await db.query('UPDATE users SET subscription_status = "active", subscription_plan = ?, subscription_end = ? WHERE id = ?', [planName, newEndDate, userId]);

            res.status(200).json({ success: true, message: 'Payment successful, subscription activated.' });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }

    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        res.status(500).json({ success: false, message: 'Payment verification error' });
    }
};

const getHistory = async (req, res) => {
    try {
        const [payments] = await db.query('SELECT tx_ref, amount, currency, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
        res.status(200).json({ success: true, history: payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching history', success: false });
    }
};

const paystackWebhook = async (req, res) => {
    try {
        const hash = crypto.createHmac('sha512', paystackSecretKey).update(JSON.stringify(req.body)).digest('hex');
        
        if (hash === req.headers['x-paystack-signature']) {
            const event = req.body;
            
            if (event.event === 'charge.success') {
                const data = event.data;
                const reference = data.reference;
                
                const [payments] = await db.query('SELECT user_id, status FROM payments WHERE tx_ref = ?', [reference]);
                
                if (payments.length > 0 && payments[0].status !== 'successful') {
                    const userId = payments[0].user_id;
                    
                    await db.query('UPDATE payments SET status = "successful" WHERE tx_ref = ?', [reference]);
                    
                    const daysToAdd = (data.amount / 100) >= 100 ? 365 : 30;
                    const planName = daysToAdd === 365 ? 'yearly' : 'monthly';
                    
                    const [users] = await db.query('SELECT subscription_end FROM users WHERE id = ?', [userId]);
                    const currentEndDate = users.length > 0 && users[0].subscription_end ? new Date(users[0].subscription_end) : new Date();
                    
                    let newEndDate = new Date();
                    if (currentEndDate > new Date()) {
                        newEndDate = new Date(currentEndDate);
                    }
                    newEndDate.setDate(newEndDate.getDate() + daysToAdd);
                    
                    await db.query('UPDATE users SET subscription_status = "active", subscription_plan = ?, subscription_end = ? WHERE id = ?', [planName, newEndDate, userId]);
                }
            }
        }
        res.sendStatus(200); // Always return 200 OK to Paystack
    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
};

module.exports = { initializePayment, verifyPayment, getHistory, paystackWebhook };
