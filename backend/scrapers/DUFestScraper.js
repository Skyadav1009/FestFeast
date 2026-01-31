/**
 * DU Fest Scraper
 * Scrapes Delhi University college fest announcements
 * Sources: College websites, student union pages, fest sites
 */

import BaseScraper from './BaseScraper.js';
import { scraperLogger as logger } from '../utils/logger.js';
import { parseFlexibleDate, categorizeEvent, extractTags, sleep } from '../utils/helpers.js';

class DUFestScraper extends BaseScraper {
  constructor() {
    super('DUFestScraper');
    
    // DU College fest sources
    this.sources = [
      {
        name: 'Fest Tracker',
        url: 'https://unstop.com/college-fests',
        type: 'listing'
      },
      {
        name: 'D2C Events',
        url: 'https://dare2compete.com/festival',
        type: 'listing'
      }
    ];
  }

  async scrape() {
    const allEvents = [];
    
    for (const source of this.sources) {
      try {
        logger.info(`[${this.name}] Scraping: ${source.name}`);
        
        let events = [];
        
        if (source.name === 'Fest Tracker') {
          events = await this.scrapeUnstop();
        } else if (source.name === 'D2C Events') {
          events = await this.scrapeDare2Compete();
        }
        
        allEvents.push(...events);
        
        // Polite delay between sources
        await sleep(2000);
        
      } catch (error) {
        this.logError(`Failed to scrape ${source.name}`, error);
      }
    }
    
    return allEvents;
  }

  /**
   * Scrape Unstop (formerly Dare2Compete) college fests
   */
  async scrapeUnstop() {
    const events = [];
    
    try {
      await this.navigate('https://unstop.com/college-fests');
      
      // Wait for fest cards to load
      const loaded = await this.waitForSelector('.fest-card, .opportunity-card, [class*="festival"]', 10000);
      
      if (!loaded) {
        // Try alternate approach - scroll and wait
        await this.page.evaluate(() => window.scrollTo(0, 1000));
        await sleep(2000);
      }
      
      // Try multiple selectors for fest cards
      const selectors = [
        '.fest-card',
        '.opportunity-card',
        '[class*="festival-card"]',
        '.MuiCard-root',
        'article'
      ];
      
      let cards = [];
      for (const selector of selectors) {
        cards = await this.page.$$(selector);
        if (cards.length > 0) break;
      }
      
      logger.info(`[${this.name}] Found ${cards.length} potential fest cards on Unstop`);
      
      for (const card of cards.slice(0, 20)) { // Limit to 20
        try {
          // Extract title
          const title = await this.getText('h3, h2, [class*="title"], .card-title', card) ||
                       await this.getText('a', card);
          
          if (!title || title.length < 5) continue;
          
          // Skip if not Delhi/NCR related (basic filter)
          const fullText = await card.textContent() || '';
          const isDelhiNCR = /delhi|ncr|gurgaon|noida|greater noida|du |hindu|srcc|stephens|hansraj|ramjas|lsr|venky|gargi|jesus|miranda|dtu|nsit|iiit|igdtuw/i.test(fullText);
          
          // Extract other details
          const dateText = await this.getText('[class*="date"], .date, time', card);
          const location = await this.getText('[class*="location"], .location, [class*="venue"]', card) || 'Delhi NCR';
          const link = await this.getAttribute('a', 'href', card);
          const organizer = await this.getText('[class*="organizer"], [class*="college"], .org', card);
          
          // Parse date
          const parsedDate = parseFlexibleDate(dateText);
          
          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: organizer.trim(),
            link: link.startsWith('http') ? link : `https://unstop.com${link}`,
            source: 'Unstop',
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: extractTags(title, fullText),
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: fullText.toLowerCase().includes('free') ? 'Free' : 'Check website',
            confidence: isDelhiNCR ? 0.9 : 0.6
          });
          
        } catch (error) {
          this.logError('Error parsing Unstop card', error);
        }
      }
      
    } catch (error) {
      this.logError('Unstop scraping failed', error);
    }
    
    return events;
  }

  /**
   * Scrape Dare2Compete festivals
   */
  async scrapeDare2Compete() {
    const events = [];
    
    try {
      await this.navigate('https://dare2compete.com/festival');
      
      await this.waitForSelector('.festival-card, .event-card, article', 10000);
      
      const cards = await this.page.$$('.festival-card, .event-card, article, .card');
      
      logger.info(`[${this.name}] Found ${cards.length} potential cards on D2C`);
      
      for (const card of cards.slice(0, 15)) {
        try {
          const title = await this.getText('h3, h2, .title, a', card);
          if (!title || title.length < 5) continue;
          
          const fullText = await card.textContent() || '';
          const dateText = await this.getText('.date, time, [class*="date"]', card);
          const location = await this.getText('.location, [class*="venue"]', card) || 'Delhi NCR';
          const link = await this.getAttribute('a', 'href', card);
          const organizer = await this.getText('.organizer, .college, .org', card);
          
          const parsedDate = parseFlexibleDate(dateText);
          
          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: organizer.trim(),
            link: link?.startsWith('http') ? link : `https://dare2compete.com${link || ''}`,
            source: 'Dare2Compete',
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: extractTags(title, fullText),
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: 'Check website',
            confidence: 0.8
          });
          
        } catch (error) {
          this.logError('Error parsing D2C card', error);
        }
      }
      
    } catch (error) {
      this.logError('D2C scraping failed', error);
    }
    
    return events;
  }
}

export default DUFestScraper;
