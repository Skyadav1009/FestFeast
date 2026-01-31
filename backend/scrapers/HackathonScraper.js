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
        url: 'https://mlh.io/seasons/2025/events',
        type: 'hackathon'
      },
      {
        name: 'Devpost',
        url: 'https://devpost.com/hackathons?location=India',
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
          
          const dateText = await this.getText('[class*="date"], time, [class*="Date"]', card);
          const location = await this.getText('[class*="location"], [class*="venue"]', card) || 
                          (fullText.toLowerCase().includes('online') ? 'Online' : 'India');
          
          let link = await this.getAttribute('a', 'href', card);
          if (!link) {
            link = await card.getAttribute('href');
          }
          
          const parsedDate = parseFlexibleDate(dateText);
          
          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Devfolio',
            link: link?.startsWith('http') ? link : `https://devfolio.co${link || ''}`,
            source: 'Devfolio',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'Tech Fest', ...extractTags(title, fullText)],
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: 'Free',
            confidence: isIndia ? 0.9 : 0.7
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
      await this.navigate('https://mlh.io/seasons/2025/events');
      
      await this.waitForSelector('.event, .event-card, article', 10000);
      
      const cards = await this.page.$$('.event, .event-card, article');
      
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
          
          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'MLH',
            link: link?.startsWith('http') ? link : `https://mlh.io${link || ''}`,
            source: 'MLH',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'MLH', 'Tech Fest'],
            mode: fullText.toLowerCase().includes('in-person') ? 'Offline' : 
                  fullText.toLowerCase().includes('hybrid') ? 'Hybrid' : 'Online',
            entryFee: 'Free',
            confidence: 0.95
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
          
          events.push({
            title: title.trim(),
            description: prize ? `Prize: ${prize}` : '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Devpost',
            link: link?.startsWith('http') ? link : `https://devpost.com${link || ''}`,
            source: 'Devpost',
            sourceType: 'scraper',
            category: 'hackathon',
            tags: ['Hackathon', 'Tech Fest'],
            mode: 'Online',
            entryFee: 'Free',
            confidence: 0.9
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
}

export default HackathonScraper;
