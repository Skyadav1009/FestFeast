/**
 * Health Check API
 * Server health and status endpoints
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import scraperService from '../services/scraperService.js';

const router = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStates[dbStatus] || 'unknown',
      connected: dbStatus === 1
    },
    scraper: {
      isRunning: scraperService.getStatus().isRunning,
      lastRun: scraperService.getStatus().lastRun
    },
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    }
  });
});

/**
 * GET /api/health/db
 * Database health check
 */
router.get('/db', async (req, res) => {
  try {
    // Ping database
    await mongoose.connection.db.admin().ping();
    
    res.json({
      success: true,
      database: 'connected',
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      database: 'disconnected',
      error: error.message
    });
  }
});

export default router;
