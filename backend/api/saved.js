/**
 * Saved Events API
 * Handles saving/unsaving events for anonymous users via device tokens
 */

import express from 'express';
import SavedEvent from '../models/SavedEvent.js';
import Event from '../models/Event.js';
import { deviceAuthMiddleware, requireDeviceToken, generateDeviceToken } from '../middleware/deviceAuth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/saved/token
 * Get or generate a device token
 */
router.get('/token', deviceAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      deviceId: req.deviceId,
      token: req.deviceToken,
      isNew: req.isNewDevice || false
    }
  });
});

/**
 * POST /api/saved/token
 * Generate a new device token (force new)
 */
router.post('/token', (req, res) => {
  const { deviceId, token } = generateDeviceToken();
  
  res.json({
    success: true,
    data: {
      deviceId,
      token,
      isNew: true
    }
  });
});

/**
 * GET /api/saved
 * Get all saved events for the current device
 */
router.get('/', requireDeviceToken, async (req, res) => {
  try {
    const events = await SavedEvent.getSavedEventsWithDetails(req.deviceId);
    
    res.json({
      success: true,
      data: events,
      meta: {
        total: events.length,
        deviceId: req.deviceId
      }
    });
  } catch (error) {
    logger.error(`Failed to get saved events: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve saved events'
    });
  }
});

/**
 * GET /api/saved/ids
 * Get just the IDs of saved events (for quick checking)
 */
router.get('/ids', requireDeviceToken, async (req, res) => {
  try {
    const eventIds = await SavedEvent.getSavedEventIds(req.deviceId);
    
    res.json({
      success: true,
      data: eventIds
    });
  } catch (error) {
    logger.error(`Failed to get saved event IDs: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve saved event IDs'
    });
  }
});

/**
 * POST /api/saved/:eventId
 * Save an event
 */
router.post('/:eventId', requireDeviceToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const result = await SavedEvent.saveEvent(req.deviceId, eventId);
    
    logger.info(`Event ${eventId} saved by device ${req.deviceId}`);
    
    res.json({
      success: true,
      data: {
        eventId,
        saved: true,
        alreadySaved: result.alreadySaved || false
      }
    });
  } catch (error) {
    logger.error(`Failed to save event: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to save event'
    });
  }
});

/**
 * DELETE /api/saved/:eventId
 * Unsave an event
 */
router.delete('/:eventId', requireDeviceToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const deleted = await SavedEvent.unsaveEvent(req.deviceId, eventId);
    
    if (deleted) {
      logger.info(`Event ${eventId} unsaved by device ${req.deviceId}`);
    }
    
    res.json({
      success: true,
      data: {
        eventId,
        saved: false,
        wasDeleted: deleted
      }
    });
  } catch (error) {
    logger.error(`Failed to unsave event: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to unsave event'
    });
  }
});

/**
 * GET /api/saved/check/:eventId
 * Check if an event is saved
 */
router.get('/check/:eventId', requireDeviceToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const isSaved = await SavedEvent.isSaved(req.deviceId, eventId);
    
    res.json({
      success: true,
      data: {
        eventId,
        saved: isSaved
      }
    });
  } catch (error) {
    logger.error(`Failed to check saved status: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to check saved status'
    });
  }
});

export default router;
