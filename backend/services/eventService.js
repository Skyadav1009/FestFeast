/**
 * Event Service
 * Business logic for event CRUD operations
 */

import Event from '../models/Event.js';
import logger from '../utils/logger.js';

class EventService {
  /**
   * Get all published events with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getAllEvents(filters = {}) {
    try {
      const query = { status: 'published' };
      
      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      
      if (filters.mode) {
        query.mode = filters.mode;
      }
      
      if (filters.tag) {
        query.tags = { $in: [filters.tag] };
      }
      
      if (filters.source) {
        query.source = filters.source;
      }
      
      // Date filter - upcoming events only
      if (filters.upcoming === 'true') {
        query.$or = [
          { startDate: { $gte: new Date() } },
          { startDate: null }
        ];
      }
      
      // Search filter
      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { organizer: { $regex: filters.search, $options: 'i' } },
          { location: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const limit = parseInt(filters.limit) || 100;
      const skip = parseInt(filters.skip) || 0;
      
      const events = await Event.find(query)
        .sort({ startDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      const total = await Event.countDocuments(query);
      
      return {
        events,
        meta: {
          total,
          limit,
          skip,
          hasMore: skip + events.length < total
        }
      };
      
    } catch (error) {
      logger.error(`EventService.getAllEvents error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest N events
   * @param {number} limit - Number of events
   * @returns {Promise<Array>}
   */
  async getLatestEvents(limit = 20) {
    try {
      const events = await Event.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      
      return events;
      
    } catch (error) {
      logger.error(`EventService.getLatestEvents error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get single event by ID
   * @param {string} id - Event ID
   * @returns {Promise<Object|null>}
   */
  async getEventById(id) {
    try {
      const event = await Event.findById(id).lean();
      return event;
    } catch (error) {
      logger.error(`EventService.getEventById error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get events by category
   * @param {string} category - Event category
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  async getEventsByCategory(category, limit = 50) {
    try {
      const events = await Event.find({ 
        status: 'published',
        category 
      })
        .sort({ startDate: 1 })
        .limit(limit)
        .lean();
      
      return events;
      
    } catch (error) {
      logger.error(`EventService.getEventsByCategory error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get event statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const [
        totalEvents,
        publishedEvents,
        expiredEvents,
        categoryStats,
        sourceStats
      ] = await Promise.all([
        Event.countDocuments(),
        Event.countDocuments({ status: 'published' }),
        Event.countDocuments({ status: 'expired' }),
        Event.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Event.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } }
        ])
      ]);

      return {
        totalEvents,
        publishedEvents,
        expiredEvents,
        byCategory: categoryStats.reduce((acc, { _id, count }) => {
          acc[_id || 'unknown'] = count;
          return acc;
        }, {}),
        bySource: sourceStats.reduce((acc, { _id, count }) => {
          acc[_id || 'unknown'] = count;
          return acc;
        }, {})
      };
      
    } catch (error) {
      logger.error(`EventService.getStats error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new event manually
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>}
   */
  async createEvent(eventData) {
    try {
      const { event, isNew } = await Event.findOrCreate({
        ...eventData,
        sourceType: 'manual'
      });
      
      if (!isNew) {
        throw new Error('Event with this title or link already exists');
      }
      
      return event;
      
    } catch (error) {
      logger.error(`EventService.createEvent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an event
   * @param {string} id - Event ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>}
   */
  async updateEvent(id, updateData) {
    try {
      const event = await Event.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!event) {
        throw new Error('Event not found');
      }
      
      return event;
      
    } catch (error) {
      logger.error(`EventService.updateEvent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an event
   * @param {string} id - Event ID
   * @returns {Promise<boolean>}
   */
  async deleteEvent(id) {
    try {
      const result = await Event.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      logger.error(`EventService.deleteEvent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unique tags from all events
   * @returns {Promise<Array>}
   */
  async getAllTags() {
    try {
      const tags = await Event.distinct('tags', { status: 'published' });
      return tags.filter(Boolean).sort();
    } catch (error) {
      logger.error(`EventService.getAllTags error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unique sources
   * @returns {Promise<Array>}
   */
  async getAllSources() {
    try {
      const sources = await Event.distinct('source');
      return sources.filter(Boolean).sort();
    } catch (error) {
      logger.error(`EventService.getAllSources error: ${error.message}`);
      throw error;
    }
  }
}

// Singleton instance
const eventService = new EventService();

export default eventService;
