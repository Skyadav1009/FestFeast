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
 * Check if a date string is a placeholder/invalid
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
export const isPlaceholderDate = (dateStr) => {
  if (!dateStr) return true;
  const cleaned = dateStr.trim().toLowerCase();
  // Common placeholder patterns
  return /^1\s*jan$/i.test(cleaned) ||
    cleaned === '01 jan' ||
    cleaned === 'tba' ||
    cleaned === 'tbd' ||
    cleaned === 'coming soon' ||
    cleaned.length < 3;
};

/**
 * Get a smart default date (null = TBA, not fake date)
 * @param {string} dateText - Raw date text
 * @returns {Date|null}
 */
export const getSmartDate = (dateText) => {
  if (!dateText || isPlaceholderDate(dateText)) {
    return null; // Return null for TBA dates, not fake dates
  }
  return parseFlexibleDate(dateText);
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

  // Clean the date string
  const cleanDate = dateStr.trim().replace(/\s+/g, ' ');

  // Skip obviously invalid dates
  if (/^1\s*jan$/i.test(cleanDate) || cleanDate === '1 JAN' || cleanDate === '01 Jan') {
    return null;
  }

  // Handle relative dates first
  const today = new Date();
  const lowerDate = cleanDate.toLowerCase();

  if (lowerDate === 'today' || lowerDate === 'tonight') {
    return today;
  }
  if (lowerDate === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lowerDate.includes('next week') || lowerDate.includes('this week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  if (lowerDate.includes('this weekend')) {
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    const weekend = new Date(today);
    weekend.setDate(weekend.getDate() + daysUntilSaturday);
    return weekend;
  }

  // Try standard Date parsing first
  const directParse = new Date(dateStr);
  if (!isNaN(directParse.getTime()) && directParse.getFullYear() >= 2024) {
    return directParse;
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  // Common date patterns (in order of priority)
  const patterns = [
    // "15 Feb 2025", "15th February 2025"
    { regex: /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, type: 'dmy' },
    // "Feb 15, 2025" or "February 15, 2025"
    { regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i, type: 'mdy' },
    // "2025-02-15" ISO
    { regex: /(\d{4})-(\d{2})-(\d{2})/, type: 'iso' },
    // Date ranges: "Feb 15 - 17, 2025" or "15 - 17 Feb 2025" (extract start date)
    { regex: /(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*(\d{4})/i, type: 'dmy' },
    { regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s*[-–]\s*\d{1,2},?\s*(\d{4})/i, type: 'mdy' },
    // "15/02/2025" or "15-02-2025"
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, type: 'dmySlash' },
    // "2025/02/15"
    { regex: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, type: 'ymd' },
    // "Sat, 21 Feb • 02:00 PM" (AllEvents format)
    { regex: /(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*,?\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, type: 'dm' },
    // "Ends Feb 15, 2025" - extract date from longer strings
    { regex: /(?:ends?|starts?|on|from|deadline)\s*:?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i, type: 'mdy' },
    // "15 Feb" or "15th Feb" (no year - assume current/next year)
    { regex: /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i, type: 'dm' },
    // "Feb 15" (no year)
    { regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?/i, type: 'md' },
  ];

  for (const { regex, type } of patterns) {
    const match = cleanDate.match(regex);
    if (match) {
      try {
        let day, month, year;

        switch (type) {
          case 'dmy':
            day = parseInt(match[1]);
            month = months[match[2].toLowerCase().substring(0, 3)];
            year = parseInt(match[3]);
            break;
          case 'mdy':
            month = months[match[1].toLowerCase().substring(0, 3)];
            day = parseInt(match[2]);
            year = parseInt(match[3]);
            break;
          case 'iso':
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            day = parseInt(match[3]);
            break;
          case 'ymd':
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            day = parseInt(match[3]);
            break;
          case 'dm':
            day = parseInt(match[1]);
            month = months[match[2].toLowerCase().substring(0, 3)];
            // Assume current year, or next year if month has passed
            year = month < currentMonth ? currentYear + 1 : currentYear;
            break;
          case 'md':
            month = months[match[1].toLowerCase().substring(0, 3)];
            day = parseInt(match[2]);
            year = month < currentMonth ? currentYear + 1 : currentYear;
            break;
          case 'dmySlash':
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            year = parseInt(match[3]);
            break;
        }

        if (day && month !== undefined && year) {
          // Validate day is in valid range
          if (day < 1 || day > 31) continue;
          if (month < 0 || month > 11) continue;

          const date = new Date(year, month, day);
          if (!isNaN(date.getTime()) && year >= 2024) {
            return date;
          }
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
};

/**
 * Parse date range and return start and end dates
 * @param {string} dateStr - Date string that may contain a range
 * @returns {{start: Date|null, end: Date|null}}
 */
export const parseDateRange = (dateStr) => {
  if (!dateStr) return { start: null, end: null };

  const cleanDate = dateStr.trim();

  // Look for date range patterns like "Feb 15 - 17, 2025" or "15-17 Feb 2025"
  const rangePatterns = [
    // "Feb 15 - 17, 2025"
    {
      regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i,
      parse: (m) => {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const month = months[m[1].toLowerCase().substring(0, 3)];
        return {
          start: new Date(parseInt(m[4]), month, parseInt(m[2])),
          end: new Date(parseInt(m[4]), month, parseInt(m[3]))
        };
      }
    },
    // "15 - 17 Feb 2025"
    {
      regex: /(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*(\d{4})/i,
      parse: (m) => {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const month = months[m[3].toLowerCase().substring(0, 3)];
        return {
          start: new Date(parseInt(m[4]), month, parseInt(m[1])),
          end: new Date(parseInt(m[4]), month, parseInt(m[2]))
        };
      }
    }
  ];

  for (const { regex, parse } of rangePatterns) {
    const match = cleanDate.match(regex);
    if (match) {
      const result = parse(match);
      if (!isNaN(result.start?.getTime()) && !isNaN(result.end?.getTime())) {
        return result;
      }
    }
  }

  // If no range found, try to parse as single date
  const singleDate = parseFlexibleDate(dateStr);
  return { start: singleDate, end: singleDate };
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
