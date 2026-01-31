/**
 * MongoDB Database Connection
 * Uses Mongoose to connect to MongoDB Atlas
 */

import mongoose from 'mongoose';
import logger from './utils/logger.js';

/**
 * Connect to MongoDB Atlas
 * Implements connection retry logic and event handlers
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Mongoose connection options
    const options = {
      maxPoolSize: 10,           // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(uri, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
