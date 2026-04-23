const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/auth');

router.post('/login', adminController.adminLogin);
router.get('/stats', verifyAdmin, adminController.getStats);
router.delete('/users/:id', verifyAdmin, adminController.deleteUser);
router.post('/users', verifyAdmin, adminController.addUser);

module.exports = router;
