const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

    const tokenBody = token.split(' ')[1]; // Expecting "Bearer [token]"
    if (!tokenBody) return res.status(403).json({ success: false, message: 'Malformed token' });

    jwt.verify(tokenBody, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, message: 'Unauthorized' });
        req.userId = decoded.id;
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ success: false, message: 'No token provided' });

    const tokenBody = token.split(' ')[1];
    if (!tokenBody) return res.status(403).json({ success: false, message: 'Malformed token' });

    jwt.verify(tokenBody, process.env.JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'admin') return res.status(401).json({ success: false, message: 'Unauthorized Admin' });
        req.userRole = decoded.role;
        next();
    });
};

module.exports = { verifyToken, verifyAdmin };
