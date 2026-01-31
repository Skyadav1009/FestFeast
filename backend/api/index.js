/**
 * API Routes Index
 * Combine all API route modules
 */

import { Router } from 'express';
import eventsRouter from './events.js';
import scrapeRouter from './scrape.js';
import healthRouter from './health.js';

const router = Router();

// Mount route modules
router.use('/events', eventsRouter);
router.use('/scrape', scrapeRouter);
router.use('/health', healthRouter);

// API root info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FestFeast API v1.0',
    endpoints: {
      events: {
        'GET /api/events': 'Get all events (with filters)',
        'GET /api/events/latest': 'Get latest 20 events',
        'GET /api/events/stats': 'Get event statistics',
        'GET /api/events/tags': 'Get all tags',
        'GET /api/events/sources': 'Get all sources',
        'GET /api/events/category/:category': 'Get events by category',
        'GET /api/events/:id': 'Get single event',
        'POST /api/events': 'Create event (protected)',
        'PUT /api/events/:id': 'Update event (protected)',
        'DELETE /api/events/:id': 'Delete event (protected)'
      },
      scraper: {
        'POST /api/scrape': 'Trigger all scrapers (API key required)',
        'POST /api/scrape/:name': 'Trigger specific scraper',
        'GET /api/scrape/status': 'Get scraper status',
        'GET /api/scrape/list': 'List available scrapers'
      },
      health: {
        'GET /api/health': 'Server health check',
        'GET /api/health/db': 'Database health check'
      }
    },
    documentation: 'See README.md for full documentation'
  });
});

export default router;
