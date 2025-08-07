const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config/config');
const logger = require('./utils/logger');
const urlRoutes = require('./routes/urlRoutes');
const authRoutes = require('./routes/authRoutes');


const app = express();

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api/v1/urls', urlRoutes);
app.use('/api/v1/auth', authRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
