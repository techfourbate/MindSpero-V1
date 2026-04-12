const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { extractTextFromPDF } = require('../utils/pdfExtractor');
const { processNotes, generateSpeech } = require('../utils/openai');

const processContent = async (req, res) => {
    try {
        const userId = req.userId;
        let originalText = req.body.text || "";

        // Check user subscription limits. For simplicity: basic rate limiting logic
        const [users] = await db.query('SELECT subscription_status, subscription_end FROM users WHERE id = ?', [userId]);
        const user = users[0];
        if (user.subscription_status === 'expired') {
            return res.status(403).json({ success: false, message: 'Your subscription or trial has expired. Please upgrade.' });
        }

        if (user.subscription_status === 'trial') {
            const today = new Date().toISOString().slice(0, 10);
            const [usage] = await db.query('SELECT COUNT(*) as cnt FROM uploads WHERE user_id = ? AND DATE(created_at) = ?', [userId, today]);
            if (usage[0].cnt >= 2) {
                return res.status(403).json({ success: false, message: 'Free tier limit reached (2/day). Please upgrade.' });
            }
        }

        let filename = 'Text Input';
        if (req.file) {
            filename = req.file.originalname;
            if (req.file.mimetype === 'application/pdf') {
                originalText = await extractTextFromPDF(req.file.path);
            } else {
                originalText = fs.readFileSync(req.file.path, 'utf8');
            }
            // Cleanup temp file uploaded by multer
            fs.unlinkSync(req.file.path);
        }

        if (!originalText || originalText.trim() === '') {
            return res.status(400).json({ success: false, message: 'No content provided' });
        }

        // Send to OpenAI
        const aiResult = await processNotes(originalText);
        
        // Save to DB
        const [result] = await db.query(
            `INSERT INTO uploads 
            (user_id, filename, original_text, explanation, key_points, exam_qa) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId, 
                filename, 
                originalText.slice(0, 20000), // Avoid massive db fields
                aiResult.explanation, 
                JSON.stringify(aiResult.keyPoints), 
                JSON.stringify(aiResult.examQA)
            ]
        );

        const uploadId = result.insertId;

        // Optionally, generate audio here if it's a paid user, or defer it to the /audio endpoint
        // Let's rely on /audio endpoint to be explicitly called by the user on the dashboard

        res.status(200).json({ 
            success: true, 
            data: {
                id: uploadId,
                filename,
                explanation: aiResult.explanation,
                keyPoints: aiResult.keyPoints,
                examQA: aiResult.examQA,
                audioScript: aiResult.audioScript
            } 
        });

    } catch (err) {
        console.error(err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'An error occurred while processing' });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const [history] = await db.query('SELECT id, filename, explanation, key_points, exam_qa, audio_url, created_at FROM uploads WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        
        res.status(200).json({ success: true, history: history.map(h => ({
            ...h,
            key_points: JSON.parse(h.key_points),
            exam_qa: JSON.parse(h.exam_qa)
        })) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const generateAudio = async (req, res) => {
    try {
        const userId = req.userId;
        const { uploadId, script } = req.body;

        const [users] = await db.query('SELECT subscription_status FROM users WHERE id = ?', [userId]);
        const user = users[0];
        
        // Block audio generation if not active or trial
        if (user.subscription_status === 'expired') {
            return res.status(403).json({ success: false, message: 'Audio features require subscription' });
        }

        // Optional check for paid user only (can be adjusted according to business logic)
        // Let's say trial users get it but rate limited.

        const audioFilename = `audio_${userId}_${uploadId}_${Date.now()}.mp3`;
        const audioPath = path.join(__dirname, '..', 'uploads', audioFilename);

        await generateSpeech(script, audioPath);

        const audioUrl = `/uploads/${audioFilename}`;

        await db.query('UPDATE uploads SET audio_url = ? WHERE id = ?', [audioUrl, uploadId]);

        res.status(200).json({ success: true, url: audioUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to generate audio' });
    }
};

module.exports = { processContent, getHistory, generateAudio };
