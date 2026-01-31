/**
 * Events API Routes
 * RESTful endpoints for event data
 */

import { Router } from 'express';
import eventService from '../services/eventService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/events
 * Get all published events with optional filters
 * 
 * Query params:
 * - category: fest, hackathon, cultural, tech, music, workshop, other
 * - mode: Offline, Online, Hybrid
 * - tag: Filter by tag
 * - source: Filter by source
 * - search: Search in title, description, organizer
 * - upcoming: 'true' to show only upcoming events
 * - limit: Max results (default 100)
 * - skip: Offset for pagination
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      mode: req.query.mode,
      tag: req.query.tag,
      source: req.query.source,
      search: req.query.search,
      upcoming: req.query.upcoming,
      limit: req.query.limit,
      skip: req.query.skip
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );
    
    const result = await eventService.getAllEvents(filters);
    
    res.json({
      success: true,
      data: result.events,
      meta: result.meta
    });
    
  } catch (error) {
    logger.error(`GET /events error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

/**
 * GET /api/events/latest
 * Get latest 20 events sorted by creation date
 * 
 * Query params:
 * - limit: Number of events (default 20, max 50)
 */
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const events = await eventService.getLatestEvents(limit);
    
    res.json({
      success: true,
      data: events,
      meta: {
        count: events.length,
        limit
      }
    });
    
  } catch (error) {
    logger.error(`GET /events/latest error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest events'
    });
  }
});

/**
 * GET /api/events/stats
 * Get event statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await eventService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error(`GET /events/stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

/**
 * GET /api/events/tags
 * Get all unique tags
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await eventService.getAllTags();
    
    res.json({
      success: true,
      data: tags
    });
    
  } catch (error) {
    logger.error(`GET /events/tags error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags'
    });
  }
});

/**
 * GET /api/events/sources
 * Get all unique sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await eventService.getAllSources();
    
    res.json({
      success: true,
      data: sources
    });
    
  } catch (error) {
    logger.error(`GET /events/sources error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources'
    });
  }
});

/**
 * GET /api/events/category/:category
 * Get events by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const events = await eventService.getEventsByCategory(category, limit);
    
    res.json({
      success: true,
      data: events,
      meta: {
        category,
        count: events.length
      }
    });
    
  } catch (error) {
    logger.error(`GET /events/category error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events by category'
    });
  }
});

/**
 * GET /api/events/:id
 * Get single event by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      data: event
    });
    
  } catch (error) {
    logger.error(`GET /events/:id error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

/**
 * POST /api/events
 * Create a new event manually (protected)
 */
router.post('/', async (req, res) => {
  try {
    // Basic validation
    const { title, source, link } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required'
      });
    }
    
    const event = await eventService.createEvent(req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
    
  } catch (error) {
    logger.error(`POST /events error: ${error.message}`);
    res.status(error.message.includes('already exists') ? 409 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/events/:id
 * Update an event (protected)
 */
router.put('/:id', async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    
    res.json({
      success: true,
      data: event
    });
    
  } catch (error) {
    logger.error(`PUT /events/:id error: ${error.message}`);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event (protected)
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
    
  } catch (error) {
    logger.error(`DELETE /events/:id error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

export default router;
