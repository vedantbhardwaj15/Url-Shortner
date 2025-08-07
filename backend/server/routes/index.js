const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./authRoutes');
const urlRoutes = require('./urlRoutes');

// API versioning (optional but recommended)
router.use('/v1/auth', authRoutes);
router.use('/v1/urls', urlRoutes);

module.exports = router;