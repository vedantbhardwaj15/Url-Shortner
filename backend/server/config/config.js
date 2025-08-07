module.exports = {
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_ATLAS_URI,
    jwt: {
        access_secret: process.env.JWT_ACCESS_SECRET,
        refresh_secret: process.env.JWT_REFRESH_SECRET,
        accessExpiration: '15m',
        refreshExpiration: '7d'
    },
    env: process.env.NODE_ENV || 'production',
    corsOptions: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 1000
    }
};