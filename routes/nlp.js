const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const nlpController = require('../controllers/nlpController');

const upload = multer({ dest: 'uploads/' });

router.post('/process', verifyToken, upload.single('file'), nlpController.processContent);
router.get('/history', verifyToken, nlpController.getHistory);
router.post('/audio', verifyToken, nlpController.generateAudio);

module.exports = router;
