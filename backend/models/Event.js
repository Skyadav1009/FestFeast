/**
 * Event Model
 * Schema for scraped events with deduplication support
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const eventSchema = new mongoose.Schema({
  // Core event data
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  
  description: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Date information
  date: {
    type: String,  // Flexible format since scraped dates vary
    default: null
  },
  
  startDate: {
    type: Date,
    default: null
  },
  
  endDate: {
    type: Date,
    default: null
  },
  
  // Location info
  location: {
    type: String,
    trim: true,
    default: 'Delhi NCR'
  },
  
  venue: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Event categorization
  mode: {
    type: String,
    enum: ['Offline', 'Online', 'Hybrid'],
    default: 'Offline'
  },
  
  category: {
    type: String,
    enum: ['fest', 'hackathon', 'cultural', 'tech', 'music', 'workshop', 'other'],
    default: 'other'
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // Source tracking
  source: {
    type: String,
    required: [true, 'Event source is required'],
    trim: true
  },
  
  sourceType: {
    type: String,
    enum: ['scraper', 'manual', 'api'],
    default: 'scraper'
  },
  
  link: {
    type: String,
    trim: true,
    default: ''
  },
  
  ticketLink: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Organizer info
  organizer: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Entry/pricing
  entryFee: {
    type: String,
    default: 'Free'
  },
  
  // Image URL if available
  imageUrl: {
    type: String,
    default: ''
  },
  
  // Deduplication hash (title + link combined)
  hash: {
    type: String,
    required: true
    // Note: unique index defined below in eventSchema.index()
  },
  
  // Event status
  status: {
    type: String,
    enum: ['draft', 'published', 'expired'],
    default: 'published'
  },
  
  // Scraper confidence (0-1 for AI scraped content)
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  
  // Metadata
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  
  lastVerified: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true,  // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
eventSchema.index({ hash: 1 }, { unique: true });
eventSchema.index({ status: 1, startDate: -1 });
eventSchema.index({ category: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ source: 1 });

/**
 * Generate deduplication hash from title and link
 * @param {string} title - Event title
 * @param {string} link - Event URL
 * @returns {string} MD5 hash
 */
eventSchema.statics.generateHash = function(title, link) {
  const normalizedTitle = (title || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedLink = (link || '').toLowerCase().trim();
  const combined = `${normalizedTitle}|${normalizedLink}`;
  return crypto.createHash('md5').update(combined).digest('hex');
};

/**
 * Check if event already exists by hash
 * @param {string} hash - Deduplication hash
 * @returns {Promise<boolean>}
 */
eventSchema.statics.existsByHash = async function(hash) {
  const count = await this.countDocuments({ hash });
  return count > 0;
};

/**
 * Find or create event (upsert with dedup)
 * @param {Object} eventData - Event data object
 * @returns {Promise<{event: Object, isNew: boolean}>}
 */
eventSchema.statics.findOrCreate = async function(eventData) {
  const hash = this.generateHash(eventData.title, eventData.link);
  
  const existingEvent = await this.findOne({ hash });
  
  if (existingEvent) {
    // Update lastVerified timestamp
    existingEvent.lastVerified = new Date();
    await existingEvent.save();
    return { event: existingEvent, isNew: false };
  }
  
  // Create new event
  const newEvent = await this.create({
    ...eventData,
    hash
  });
  
  return { event: newEvent, isNew: true };
};

/**
 * Auto-expire old events
 * Mark events as expired if endDate has passed
 */
eventSchema.statics.autoExpireEvents = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      status: 'published',
      endDate: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  
  return result.modifiedCount;
};

/**
 * Get published events sorted by date
 * @param {Object} filters - Optional filters
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
eventSchema.statics.getPublishedEvents = async function(filters = {}, limit = 100) {
  const query = { status: 'published', ...filters };
  
  return this.find(query)
    .sort({ startDate: 1, createdAt: -1 })
    .limit(limit)
    .lean();
};

// Pre-save middleware to generate hash if not provided
eventSchema.pre('save', function(next) {
  if (!this.hash) {
    this.hash = this.constructor.generateHash(this.title, this.link);
  }
  next();
});

// Virtual for checking if event is upcoming
eventSchema.virtual('isUpcoming').get(function() {
  if (!this.startDate) return true;
  return new Date(this.startDate) > new Date();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
