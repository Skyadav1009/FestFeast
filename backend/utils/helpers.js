/**
 * Utility Helper Functions
 */

import crypto from 'crypto';

/**
 * Generate MD5 hash from string
 * @param {string} str - Input string
 * @returns {string} MD5 hash
 */
export const generateHash = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Normalize text for comparison
 * @param {string} text - Input text
 * @returns {string} Normalized text
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
};

/**
 * Extract date from various string formats
 * @param {string} dateStr - Date string in various formats
 * @returns {Date|null} Parsed date or null
 */
export const parseFlexibleDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Try standard Date parsing first
  const directParse = new Date(dateStr);
  if (!isNaN(directParse.getTime())) {
    return directParse;
  }
  
  // Common date patterns
  const patterns = [
    // "15 Feb 2025", "15th February 2025"
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
    // "Feb 15, 2025"
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    // "2025-02-15"
    /(\d{4})-(\d{2})-(\d{2})/
  ];
  
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      try {
        if (pattern === patterns[2]) {
          // ISO format
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else if (pattern === patterns[0]) {
          // "15 Feb 2025"
          const day = parseInt(match[1]);
          const month = months[match[2].toLowerCase().substring(0, 3)];
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        } else if (pattern === patterns[1]) {
          // "Feb 15, 2025"
          const month = months[match[1].toLowerCase().substring(0, 3)];
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          return new Date(year, month, day);
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
};

/**
 * Categorize event based on title and description
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string} Category
 */
export const categorizeEvent = (title, description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('hackathon') || text.includes('coding') || text.includes('code')) {
    return 'hackathon';
  }
  if (text.includes('tech') || text.includes('technology') || text.includes('developer')) {
    return 'tech';
  }
  if (text.includes('music') || text.includes('concert') || text.includes('edm') || text.includes('star night')) {
    return 'music';
  }
  if (text.includes('cultural') || text.includes('dance') || text.includes('drama')) {
    return 'cultural';
  }
  if (text.includes('workshop') || text.includes('seminar') || text.includes('webinar')) {
    return 'workshop';
  }
  if (text.includes('fest') || text.includes('festival')) {
    return 'fest';
  }
  
  return 'other';
};

/**
 * Extract tags from event text
 * @param {string} title - Event title
 * @param {string} description - Event description
 * @returns {string[]} Array of tags
 */
export const extractTags = (title, description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  const tags = new Set();
  
  const tagKeywords = {
    'Music Fest': ['music', 'concert', 'edm', 'band', 'dj', 'star night'],
    'College Fest': ['college', 'university', 'campus', 'student'],
    'Hackathon': ['hackathon', 'coding', 'code', 'developer', 'programming'],
    'Tech Fest': ['tech', 'technology', 'innovation', 'startup'],
    'Cultural': ['cultural', 'dance', 'drama', 'art', 'theatre'],
    'Workshop': ['workshop', 'seminar', 'webinar', 'training'],
    'Food & Drink': ['food', 'fest', 'cuisine', 'culinary', 'grub'],
    'Comedy': ['comedy', 'standup', 'comedian'],
    'North Campus': ['north campus', 'srcc', 'hansraj', 'hindu', 'stephens', 'ramjas'],
    'South Campus': ['south campus', 'venky', 'lsr', 'gargi', 'jesus']
  };
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags);
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise<any>}
 */
export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(delay * Math.pow(2, attempt - 1));
    }
  }
};

/**
 * Clean HTML from text
 * @param {string} text - Text with potential HTML
 * @returns {string} Clean text
 */
export const cleanHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};
