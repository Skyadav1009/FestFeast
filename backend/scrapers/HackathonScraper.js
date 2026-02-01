/**
 * Hackathon Scraper
 * Specialized scraper for hackathons and tech events
 */

import BaseScraper from './BaseScraper.js';
import { scraperLogger as logger } from '../utils/logger.js';
import { parseFlexibleDate, categorizeEvent, extractTags, sleep } from '../utils/helpers.js';

class HackathonScraper extends BaseScraper {
  constructor() {
    super('HackathonScraper');

    this.sources = [
      {
        name: 'Devfolio',
        url: 'https://devfolio.co/hackathons',
        type: 'hackathon'
      },
      {
        name: 'MLH',
        url: 'https://mlh.io/seasons/2026/events',
        type: 'hackathon'
      },
      {
        name: 'Devpost',
        url: 'https://devpost.com/hackathons?location=India',
        type: 'hackathon'
      },
      {
        name: 'HackerEarth',
        url: 'https://www.hackerearth.com/challenges/',
        type: 'hackathon'
      }
    ];
  }

  async scrape() {
    const allEvents = [];

    for (const source of this.sources) {
      try {
        logger.info(`[${this.name}] Scraping: ${source.name}`);

        let events = [];

        switch (source.name) {
          case 'Devfolio':
            events = await this.scrapeDevfolio();
            break;
          case 'MLH':
            events = await this.scrapeMLH();
            break;
          case 'Devpost':
            events = await this.scrapeDevpost();
            break;
          case 'HackerEarth':
            events = await this.scrapeHackerEarth();
            break;
        }

        allEvents.push(...events);
        await sleep(3000);

      } catch (error) {
        this.logError(`Failed to scrape ${source.name}`, error);
      }
    }

    return allEvents;
  }

  /**
   * Scrape Devfolio hackathons
   */
  async scrapeDevfolio() {
    const events = [];

    try {
      await this.navigate('https://devfolio.co/hackathons');

      // Wait for hackathon cards
      await this.waitForSelector('[class*="HackathonCard"], .hackathon-card, a[href*="/hackathons/"]', 10000);

      // Scroll to load more
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(1000);
      }

      const cards = await this.page.$$('[class*="HackathonCard"], .hackathon-card, a[href*="/hackathons/"]');

      logger.info(`[${this.name}] Found ${cards.length} hackathons on Devfolio`);

      for (const card of cards.slice(0, 20)) {
        try {
          const title = await this.getText('h3, h2, [class*="name"], [class*="title"]', card);
          if (!title || title.length < 3) continue;

          const fullText = await card.textContent() || '';

          // Check if India/Delhi related
          const isIndia = /india|delhi|bangalore|mumbai|online|virtual/i.test(fullText);

          // Devfolio often shows dates in various formats - try to extract from full text
          // Look for patterns like "Feb 15 - 17, 2025" or "Ends Mar 10, 2025"
          const datePatterns = [
            /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*[-–]\s*(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?[a-z]*,?\s*(\d{4})/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})/i,
            /(?:ends?|deadline|closes?)\s*:?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
            /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i
          ];

          let dateText = await this.getText('[class*="date"], time, [class*="Date"], [class*="deadline"]', card);
          let parsedDate = null;

          // Try extracting date from full text if card date selector fails
          for (const pattern of datePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }

          parsedDate = parseFlexibleDate(dateText);

          // Skip if date is clearly wrong (like "1 Jan" placeholder)
          const isPlaceholderDate = /^1\s*jan$/i.test(dateText?.trim() || '');

          const location = await this.getText('[class*="location"], [class*="venue"]', card) ||
            (fullText.toLowerCase().includes('online') ? 'Online' : 'India');

          let link = await this.getAttribute('a', 'href', card);
          if (!link) {
            link = await card.getAttribute('href');
          }

          // Determine mode based on text
          const mode = fullText.toLowerCase().includes('online') ? 'Online' :
            fullText.toLowerCase().includes('offline') ? 'Offline' : 'Hybrid';

          // Build proper URL
          const eventUrl = link?.startsWith('http') ? link : `https://devfolio.co${link || ''}`;

          events.push({
            title: title.trim(),
            description: isPlaceholderDate ? 'Date to be announced - check event link' : '',
            date: isPlaceholderDate ? 'TBA' : (dateText || 'TBA'),
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Devfolio',
            link: eventUrl,
            sourceUrl: eventUrl,
            ticketLink: eventUrl,
            source: 'Devfolio',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'Tech Fest', ...extractTags(title, fullText)],
            mode: mode,
            entryFee: 'Free',
            confidence: isIndia ? 0.9 : 0.7,
            status: 'published'
          });

        } catch (error) {
          this.logError('Error parsing Devfolio card', error);
        }
      }

    } catch (error) {
      this.logError('Devfolio scraping failed', error);
    }

    return events;
  }

  /**
   * Scrape MLH hackathons
   */
  async scrapeMLH() {
    const events = [];

    try {
      await this.navigate('https://mlh.io/seasons/2026/events');

      // MLH uses different selectors - try multiple
      await this.waitForSelector('.event-wrapper, .event, [class*="Event"], article', 10000);

      // Try different selectors for MLH's varying page structure
      let cards = await this.page.$$('.event-wrapper, [class*="event"]');
      if (cards.length === 0) {
        cards = await this.page.$$('a[href*="/events/"]');
      }

      logger.info(`[${this.name}] Found ${cards.length} hackathons on MLH`);

      for (const card of cards.slice(0, 15)) {
        try {
          const title = await this.getText('h3, h2, .event-name, .title', card);
          if (!title || title.length < 3) continue;

          const fullText = await card.textContent() || '';

          const dateText = await this.getText('.event-date, time, .date', card);
          const location = await this.getText('.event-location, .location', card) || 'Online';
          let link = await this.getAttribute('a', 'href', card);

          const parsedDate = parseFlexibleDate(dateText);

          // Build proper URL
          const eventUrl = link?.startsWith('http') ? link : `https://mlh.io${link || ''}`;

          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'MLH',
            link: eventUrl,
            sourceUrl: eventUrl,
            ticketLink: eventUrl,
            source: 'MLH',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'MLH', 'Tech Fest'],
            mode: fullText.toLowerCase().includes('in-person') ? 'Offline' :
              fullText.toLowerCase().includes('hybrid') ? 'Hybrid' : 'Online',
            entryFee: 'Free',
            confidence: 0.95,
            status: 'published'
          });

        } catch (error) {
          this.logError('Error parsing MLH card', error);
        }
      }

    } catch (error) {
      this.logError('MLH scraping failed', error);
    }

    return events;
  }

  /**
   * Scrape Devpost hackathons
   */
  async scrapeDevpost() {
    const events = [];

    try {
      await this.navigate('https://devpost.com/hackathons?location=India&status=open');

      await this.waitForSelector('.hackathon-tile, article, .challenge-listing', 10000);

      const cards = await this.page.$$('.hackathon-tile, article, .challenge-listing');

      logger.info(`[${this.name}] Found ${cards.length} hackathons on Devpost`);

      for (const card of cards.slice(0, 15)) {
        try {
          const title = await this.getText('h2, h3, .title', card);
          if (!title || title.length < 3) continue;

          const fullText = await card.textContent() || '';

          const dateText = await this.getText('.date, time, .submission-period', card);
          const location = await this.getText('.location', card) || 'Online';
          let link = await this.getAttribute('a', 'href', card);
          const prize = await this.getText('.prize, .prize-amount', card);

          const parsedDate = parseFlexibleDate(dateText);

          // Build proper URL
          const eventUrl = link?.startsWith('http') ? link : `https://devpost.com${link || ''}`;

          events.push({
            title: title.trim(),
            description: prize ? `Prize: ${prize}` : '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Devpost',
            link: eventUrl,
            sourceUrl: eventUrl,
            ticketLink: eventUrl,
            source: 'Devpost',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'Tech Fest'],
            mode: 'Online',
            entryFee: 'Free',
            confidence: 0.9,
            status: 'published'
          });

        } catch (error) {
          this.logError('Error parsing Devpost card', error);
        }
      }

    } catch (error) {
      this.logError('Devpost scraping failed', error);
    }

    return events;
  }

  /**
   * Scrape HackerEarth challenges and hackathons
   */
  async scrapeHackerEarth() {
    const events = [];

    try {
      await this.navigate('https://www.hackerearth.com/challenges/');

      // Wait for challenge cards to load
      await this.waitForSelector('[class*="challenge"], .challenge-card, article, .card', 10000);

      // Scroll to load more content
      for (let i = 0; i < 2; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 800));
        await sleep(1000);
      }

      const cards = await this.page.$$('[class*="challenge-card"], .challenge, [class*="hackathon"], article');
      logger.info(`[${this.name}] Found ${cards.length} challenges on HackerEarth`);

      for (const card of cards.slice(0, 15)) {
        try {
          const title = await this.getText('h3, h2, [class*="title"], [class*="name"]', card);
          if (!title || title.length < 5) continue;

          const fullText = await card.textContent() || '';

          // Extract details
          const dateText = await this.getText('[class*="date"], time, [class*="deadline"]', card);
          const prizeText = await this.getText('[class*="prize"], [class*="reward"]', card);
          let link = await this.getAttribute('a', 'href', card);
          if (!link) link = await card.getAttribute('href');

          const parsedDate = parseFlexibleDate(dateText);
          const eventUrl = link?.startsWith('http') ? link : `https://www.hackerearth.com${link || ''}`;

          events.push({
            title: title.trim(),
            description: prizeText ? `Prize: ${prizeText}` : '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: 'Online',
            venue: 'Online',
            organizer: 'HackerEarth',
            link: eventUrl,
            sourceUrl: eventUrl,
            ticketLink: eventUrl,
            source: 'HackerEarth',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'Coding Challenge', 'Tech', ...extractTags(title, fullText)],
            mode: 'Online',
            entryFee: 'Free',
            confidence: 0.85,
            status: 'published'
          });

        } catch (error) {
          this.logError('Error parsing HackerEarth card', error);
        }
      }

    } catch (error) {
      this.logError('HackerEarth scraping failed', error);
    }

    return events;
  }
}

export default HackathonScraper;

