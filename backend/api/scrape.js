/**
 * Scraper API Routes
 * Endpoints for triggering and monitoring scrapers
 */

import { Router } from 'express';
import scraperService from '../services/scraperService.js';
import cronService from '../services/cronService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Middleware: API Key authentication for scraper endpoints
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedKey = process.env.API_KEY;
  
  // Skip auth if no API_KEY is set (development mode)
  if (!expectedKey) {
    logger.warn('API_KEY not set - scraper endpoints are unprotected');
    return next();
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }
  
  next();
};

/**
 * POST /api/scrape
 * Manually trigger all scrapers
 * Protected by API key
 */
router.post('/', apiKeyAuth, async (req, res) => {
  try {
    logger.info('Manual scrape triggered via API');
    
    // Check if already running
    const status = scraperService.getStatus();
    if (status.isRunning) {
      return res.status(409).json({
        success: false,
        error: 'Scraper is already running',
        status
      });
    }
    
    // Run scrapers asynchronously and respond immediately
    const { async: runAsync } = req.query;
    
    if (runAsync === 'true') {
      // Fire and forget
      scraperService.runAll().catch(err => 
        logger.error(`Async scrape failed: ${err.message}`)
      );
      
      return res.json({
        success: true,
        message: 'Scraper started in background',
        checkStatusAt: '/api/scrape/status'
      });
    }
    
    // Wait for completion
    const result = await scraperService.runAll();
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`POST /scrape error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to run scrapers'
    });
  }
});

/**
 * POST /api/scrape/:scraperName
 * Run a specific scraper
 * Protected by API key
 */
router.post('/:scraperName', apiKeyAuth, async (req, res) => {
  try {
    const { scraperName } = req.params;
    
    logger.info(`Manual scrape triggered for: ${scraperName}`);
    
    const result = await scraperService.runScraper(scraperName);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error(`POST /scrape/:name error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to run scraper'
    });
  }
});

/**
 * GET /api/scrape/status
 * Get scraper status and statistics
 */
router.get('/status', (req, res) => {
  try {
    const scraperStatus = scraperService.getStatus();
    const cronStatus = cronService.getStatus();
    
    res.json({
      success: true,
      data: {
        scraper: scraperStatus,
        cron: cronStatus
      }
    });
    
  } catch (error) {
    logger.error(`GET /scrape/status error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

/**
 * GET /api/scrape/list
 * List available scrapers
 */
router.get('/list', (req, res) => {
  try {
    const status = scraperService.getStatus();
    
    res.json({
      success: true,
      data: {
        scrapers: status.scrapers,
        isRunning: status.isRunning
      }
    });
    
  } catch (error) {
    logger.error(`GET /scrape/list error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to list scrapers'
    });
  }
});

export default router;
