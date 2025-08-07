const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const redis = require('../utils/redis');

const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new Error('Authentication required');
        }
        const isBlacklisted = await redis.get(`bl:${token}`);
        if(isBlacklisted) res.status(401).json({success: false, message : 'Unauthorized'});
        const decoded = jwt.verify(token, config.jwt.access_secret);
        req.user = {
            id: decoded.sub,
            role: decoded.role
        }
        next();
    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        res.status(401).json({ success: false, message: 'Please authenticate' });
    }
};

module.exports = auth;
