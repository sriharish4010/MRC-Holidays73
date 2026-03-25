// Authentication Middleware
const jwt = require('jsonwebtoken');

// Verify JWT Token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
};

// Admin Role Check
const verifyAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Manager Role Check
const verifyManager = (req, res, next) => {
    if (!['admin', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ message: 'Manager access required' });
    }
    next();
};

// Optional Token Verification
const verifyTokenOptional = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
        } catch (error) {
            // Token invalid but continue
        }
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyManager,
    verifyTokenOptional,
};
