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

  // Source URL - the page where the event was scraped from
  sourceUrl: {
    type: String,
    trim: true,
    default: ''
  },

  // Legacy link field (kept for backward compatibility)
  link: {
    type: String,
    trim: true,
    default: ''
  },

  // Ticket/registration link
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

  // Deduplication hash (title + source combined)
  hash: {
    type: String,
    required: true
    // Note: unique index defined below in eventSchema.index()
  },

  // Title-only hash for cross-source deduplication
  titleHash: {
    type: String,
    index: true
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

// Virtual to ensure sourceUrl is always available (fallback to link)
eventSchema.virtual('effectiveSourceUrl').get(function () {
  return this.sourceUrl || this.link || '';
});

// Virtual to ensure ticketLink is always available (fallback to sourceUrl or link)
eventSchema.virtual('effectiveTicketLink').get(function () {
  return this.ticketLink || this.sourceUrl || this.link || '';
});

// Pre-save middleware to ensure sourceUrl and ticketLink are populated
eventSchema.pre('save', function (next) {
  // If sourceUrl is empty, use link
  if (!this.sourceUrl && this.link) {
    this.sourceUrl = this.link;
  }
  // If ticketLink is empty, use sourceUrl or link
  if (!this.ticketLink) {
    this.ticketLink = this.sourceUrl || this.link || '';
  }
  next();
});

// Indexes for efficient queries
eventSchema.index({ hash: 1 }, { unique: true });
eventSchema.index({ status: 1, startDate: -1 });
eventSchema.index({ category: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ source: 1 });

/**
 * Generate deduplication hash from title and source
 * Uses normalized title + source for better duplicate detection
 * @param {string} title - Event title
 * @param {string} source - Event source (e.g., 'Eventbrite', 'AllEvents')
 * @param {string} link - Optional: Event URL for additional uniqueness
 * @returns {string} MD5 hash
 */
eventSchema.statics.generateHash = function (title, source, link = '') {
  // Normalize title: lowercase, trim, collapse spaces, remove common words
  let normalizedTitle = (title || '').toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\b(the|a|an|in|on|at|for|to|of|and|or)\b/g, '') // Remove common words
    .trim()
    .replace(/\s+/g, ' '); // Collapse spaces again

  // Use source for grouping
  const normalizedSource = (source || '').toLowerCase().trim();

  // Create hash from normalized title + source
  const combined = `${normalizedTitle}|${normalizedSource}`;
  return crypto.createHash('md5').update(combined).digest('hex');
};

/**
 * Generate a title-only hash for finding near-duplicates across sources
 * @param {string} title - Event title
 * @returns {string} MD5 hash of normalized title only
 */
eventSchema.statics.generateTitleHash = function (title) {
  let normalizedTitle = (title || '').toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(the|a|an|in|on|at|for|to|of|and|or)\b/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return crypto.createHash('md5').update(normalizedTitle).digest('hex');
};

/**
 * Check if event already exists by hash
 * @param {string} hash - Deduplication hash
 * @returns {Promise<boolean>}
 */
eventSchema.statics.existsByHash = async function (hash) {
  const count = await this.countDocuments({ hash });
  return count > 0;
};

/**
 * Find or create event (upsert with dedup)
 * Now checks for duplicates by normalized title to prevent near-duplicates
 * @param {Object} eventData - Event data object
 * @returns {Promise<{event: Object, isNew: boolean}>}
 */
eventSchema.statics.findOrCreate = async function (eventData) {
  // Generate title-only hash for cross-source deduplication
  const titleHash = this.generateTitleHash(eventData.title);

  // First, check if a similar event already exists (by title)
  // This prevents duplicates from different sources
  const existingByTitle = await this.findOne({
    $or: [
      { titleHash: titleHash },
      { title: { $regex: new RegExp(`^${escapeRegex(eventData.title.trim())}$`, 'i') } }
    ]
  });

  if (existingByTitle) {
    // Update lastVerified timestamp
    existingByTitle.lastVerified = new Date();
    await existingByTitle.save();
    return { event: existingByTitle, isNew: false };
  }

  // Generate full hash for storage
  const hash = this.generateHash(eventData.title, eventData.source, eventData.link);

  // Check by full hash as fallback
  const existingByHash = await this.findOne({ hash });

  if (existingByHash) {
    existingByHash.lastVerified = new Date();
    await existingByHash.save();
    return { event: existingByHash, isNew: false };
  }

  // Create new event
  const newEvent = await this.create({
    ...eventData,
    hash,
    titleHash
  });

  return { event: newEvent, isNew: true };
};

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Auto-expire old events
 * Mark events as expired if endDate has passed
 */
eventSchema.statics.autoExpireEvents = async function () {
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
eventSchema.statics.getPublishedEvents = async function (filters = {}, limit = 100) {
  const query = { status: 'published', ...filters };

  return this.find(query)
    .sort({ startDate: 1, createdAt: -1 })
    .limit(limit)
    .lean();
};

// Pre-save middleware to generate hash if not provided
eventSchema.pre('save', function (next) {
  if (!this.hash) {
    this.hash = this.constructor.generateHash(this.title, this.source, this.link);
  }
  if (!this.titleHash) {
    this.titleHash = this.constructor.generateTitleHash(this.title);
  }
  next();
});

// Virtual for checking if event is upcoming
eventSchema.virtual('isUpcoming').get(function () {
  if (!this.startDate) return true;
  return new Date(this.startDate) > new Date();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
