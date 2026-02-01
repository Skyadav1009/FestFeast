/**
 * Health Check API
 * Server health and status endpoints
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import scraperService from '../services/scraperService.js';
import { getHealthStatus, getSourceStatus, resetSource, generateHealthReport } from '../utils/healthMonitor.js';

const router = Router();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const scraperStatus = scraperService.getStatus();

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
      isRunning: scraperStatus.isRunning,
      lastRun: scraperStatus.lastRun,
      health: scraperStatus.health
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

/**
 * GET /api/health/scrapers
 * Detailed scraper health status
 */
router.get('/scrapers', (req, res) => {
  const health = getHealthStatus();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    overallStatus: health.status,
    summary: health.summary,
    sources: health.sources,
    recentAlerts: health.recentAlerts
  });
});

/**
 * GET /api/health/scrapers/:sourceName
 * Health status for a specific source
 */
router.get('/scrapers/:sourceName', (req, res) => {
  const { sourceName } = req.params;
  const sourceStatus = getSourceStatus(sourceName);

  if (!sourceStatus) {
    return res.status(404).json({
      success: false,
      error: `Source '${sourceName}' not found`
    });
  }

  res.json({
    success: true,
    source: sourceStatus
  });
});

/**
 * POST /api/health/scrapers/:sourceName/reset
 * Reset failure count for a source (after manual fix)
 */
router.post('/scrapers/:sourceName/reset', (req, res) => {
  const { sourceName } = req.params;
  const success = resetSource(sourceName);

  if (!success) {
    return res.status(404).json({
      success: false,
      error: `Source '${sourceName}' not found`
    });
  }

  res.json({
    success: true,
    message: `Source '${sourceName}' has been reset to healthy status`
  });
});

/**
 * GET /api/health/report
 * Human-readable health report
 */
router.get('/report', (req, res) => {
  const report = generateHealthReport();

  // Return as plain text for easy viewing
  res.type('text/plain').send(report);
});

export default router;
