//const app = require('./app');
require('dotenv').config(); 
const app = require('./app');
const config = require('./config/config');
const mongoose = require('mongoose');
const logger = require('./utils/logger');

const MAX_RETRIES = 5;
let retryCount = 0;

const connectWithRetry = async () => {
    try{
        logger.info('Attempting MongoDB Atlas connection...');
        await mongoose.connect(config.mongoUri,{
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        logger.info('✅ Successfully connected to MongoDB Atlas');
        return true;
    }catch (error){
        logger.error(`❌ MongoDB connection failed: ${error.message}`);
        return false;
    }
};

const startServer = async () => {
    const connected = await connectWithRetry();
    if(!connected){
        retryCount++;
        if(retryCount >= MAX_RETRIES){
            logger.error('Exceeded maximum retry attempts. Exiting process,');
            process.exit(1);
        }
        logger.warn(`Retrying connection in 5 seconds...(${retryCount}/${MAX_RETRIES})`);
        return setTimeout(startServer, 5000);
    }
    
    const server = app.listen(config.port, () =>{
        logger.info(`🚀 Server running in ${config.env}mode on port ${config.port}`);
    });

    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down gracefully...');
        server.close(()=>{
            logger.info('Process terminated');
        });
    });
};

// Handling Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    process.exit(1);
});

startServer();