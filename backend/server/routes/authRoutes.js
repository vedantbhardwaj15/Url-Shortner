const express = require('express');
const router = express.Router();
const {
    register,
    login,
    handleRefreshToken,
    logout
    // forgotPassword,
    // resetPassword,
    // verifyEmail
} = require('../controllers/authcontroller');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// router.post('/forgot-password', forgotPassword);
// router.post('/verify-email', verifyEmail);

// // Protected routes (require valid JWT)
router.post('/refresh-tokens', handleRefreshToken);
// router.patch('/reset-password', resetPassword);

module.exports = router;
