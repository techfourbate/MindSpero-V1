const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.post('/initialize', verifyToken, paymentController.initializePayment);
router.get('/verify', verifyToken, paymentController.verifyPayment);
router.get('/history', verifyToken, paymentController.getHistory);
router.post('/webhook', paymentController.paystackWebhook); // No verifyToken, since Paystack calls this

module.exports = router;
