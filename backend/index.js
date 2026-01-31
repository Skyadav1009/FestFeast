/**
 * FestFeast Backend Server
 * Main entry point for the Express application
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import apiRouter from './api/index.js';
import { cronService } from './services/index.js';
import logger from './utils/logger.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ======================
// Middleware
// ======================

// CORS configuration - allow frontend access
app.use(cors({
  origin: [
    'http://localhost:5173',      // Vite dev server
    'http://localhost:3000',      // CRA dev server
    'http://127.0.0.1:5173',
    'https://fest-feast-2e6q38v11-shivams-projects-726dc52b.vercel.app',  // Vercel preview
    'https://festfeast.vercel.app',  // Vercel production
    /\.vercel\.app$/,  // Any Vercel preview URL
    process.env.FRONTEND_URL      // Additional frontend URL from env
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-Token'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
    logger[logLevel](`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ======================
// Routes
// ======================

// API routes
app.use('/api', apiRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FestFeast Backend',
    version: '1.0.0',
    description: 'Automation backend for Delhi NCR events',
    api: '/api',
    health: '/api/health',
    docs: 'See README.md'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// ======================
// Server Initialization
// ======================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize cron jobs
    cronService.init();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`FestFeast Backend Server`);
      logger.info('='.repeat(50));
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      logger.info(`Health check at http://localhost:${PORT}/api/health`);
      logger.info('='.repeat(50));
    });
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  cronService.stop();
  process.exit(0);
});

// Start the server
startServer();

export default app;
