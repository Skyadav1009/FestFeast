/**
 * SavedEvent Model
 * Tracks saved events per device token (anonymous users)
 */

import mongoose from 'mongoose';

const savedEventSchema = new mongoose.Schema({
  // Device token (from JWT - identifies the device/browser)
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    index: true
  },
  
  // Reference to the saved event
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  
  // When the event was saved
  savedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate saves
savedEventSchema.index({ deviceId: 1, eventId: 1 }, { unique: true });

/**
 * Get all saved event IDs for a device
 * @param {string} deviceId - Device identifier
 * @returns {Promise<string[]>} Array of event IDs
 */
savedEventSchema.statics.getSavedEventIds = async function(deviceId) {
  const saved = await this.find({ deviceId }).select('eventId').lean();
  return saved.map(s => s.eventId.toString());
};

/**
 * Check if an event is saved by a device
 * @param {string} deviceId - Device identifier
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>}
 */
savedEventSchema.statics.isSaved = async function(deviceId, eventId) {
  const count = await this.countDocuments({ deviceId, eventId });
  return count > 0;
};

/**
 * Save an event for a device
 * @param {string} deviceId - Device identifier
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Saved record
 */
savedEventSchema.statics.saveEvent = async function(deviceId, eventId) {
  try {
    const saved = await this.create({ deviceId, eventId });
    return { success: true, saved };
  } catch (error) {
    if (error.code === 11000) {
      // Already saved - that's fine
      return { success: true, alreadySaved: true };
    }
    throw error;
  }
};

/**
 * Unsave an event for a device
 * @param {string} deviceId - Device identifier
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} Whether deletion occurred
 */
savedEventSchema.statics.unsaveEvent = async function(deviceId, eventId) {
  const result = await this.deleteOne({ deviceId, eventId });
  return result.deletedCount > 0;
};

/**
 * Get saved events with full event data
 * @param {string} deviceId - Device identifier
 * @returns {Promise<Array>} Array of populated events
 */
savedEventSchema.statics.getSavedEventsWithDetails = async function(deviceId) {
  const saved = await this.find({ deviceId })
    .populate('eventId')
    .sort({ savedAt: -1 })
    .lean();
  
  // Filter out any null events (deleted events)
  return saved
    .filter(s => s.eventId !== null)
    .map(s => ({
      ...s.eventId,
      savedAt: s.savedAt
    }));
};

const SavedEvent = mongoose.model('SavedEvent', savedEventSchema);

export default SavedEvent;
