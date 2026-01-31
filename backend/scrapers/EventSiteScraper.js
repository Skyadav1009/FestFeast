/**
 * Event Site Scraper
 * Scrapes popular Delhi NCR event listing websites
 */

import BaseScraper from './BaseScraper.js';
import { scraperLogger as logger } from '../utils/logger.js';
import { parseFlexibleDate, categorizeEvent, extractTags, sleep } from '../utils/helpers.js';

class EventSiteScraper extends BaseScraper {
  constructor() {
    super('EventSiteScraper');
    
    // Event listing sites for Delhi NCR
    this.sources = [
      {
        name: 'Allevents.in',
        url: 'https://allevents.in/delhi/all',
        selectors: {
          cards: '.event-card, .event-item, article',
          title: 'h3, h2, .title, .event-title',
          date: '.date, .event-date, time',
          location: '.location, .venue',
          link: 'a'
        }
      },
      {
        name: 'Eventbrite Delhi',
        url: 'https://www.eventbrite.com/d/india--new-delhi/events/',
        selectors: {
          cards: '[data-testid="event-card"], .eds-event-card, article',
          title: 'h2, h3, .event-card__title',
          date: 'time, .date-info',
          location: '.location-info, .venue',
          link: 'a'
        }
      },
      {
        name: 'Insider Delhi',
        url: 'https://insider.in/delhi-ncr',
        selectors: {
          cards: '.card, .event-card, article',
          title: 'h3, h2, .title',
          date: '.date, time',
          location: '.location, .venue',
          link: 'a'
        }
      }
    ];
  }

  async scrape() {
    const allEvents = [];
    
    for (const source of this.sources) {
      try {
        logger.info(`[${this.name}] Scraping: ${source.name}`);
        const events = await this.scrapeSource(source);
        allEvents.push(...events);
        
        // Polite delay
        await sleep(3000);
        
      } catch (error) {
        this.logError(`Failed to scrape ${source.name}`, error);
      }
    }
    
    return allEvents;
  }

  /**
   * Generic scrape method for event listing sites
   * @param {Object} source - Source configuration
   */
  async scrapeSource(source) {
    const events = [];
    
    try {
      await this.navigate(source.url);
      
      // Wait for content
      const loaded = await this.waitForSelector(source.selectors.cards, 10000);
      
      if (!loaded) {
        // Try scrolling to trigger lazy load
        await this.page.evaluate(() => window.scrollTo(0, 2000));
        await sleep(2000);
      }
      
      const cards = await this.page.$$(source.selectors.cards);
      logger.info(`[${this.name}] Found ${cards.length} cards on ${source.name}`);
      
      for (const card of cards.slice(0, 25)) {
        try {
          const title = await this.getText(source.selectors.title, card);
          if (!title || title.length < 5) continue;
          
          const fullText = await card.textContent() || '';
          
          // Filter for Delhi NCR events
          const isDelhiNCR = /delhi|ncr|gurgaon|noida|gurugram/i.test(fullText) ||
                           source.url.includes('delhi');
          
          if (!isDelhiNCR && !source.url.includes('delhi')) continue;
          
          const dateText = await this.getText(source.selectors.date, card);
          const location = await this.getText(source.selectors.location, card) || 'Delhi NCR';
          let link = await this.getAttribute(source.selectors.link, 'href', card);
          
          // Fix relative URLs
          if (link && !link.startsWith('http')) {
            const baseUrl = new URL(source.url);
            link = `${baseUrl.origin}${link}`;
          }
          
          const parsedDate = parseFlexibleDate(dateText);
          
          events.push({
            title: title.trim().substring(0, 200),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: '',
            link: link || source.url,
            source: source.name,
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: extractTags(title, fullText),
            mode: 'Offline',
            entryFee: fullText.toLowerCase().includes('free') ? 'Free' : 'Check website',
            confidence: 0.85
          });
          
        } catch (error) {
          this.logError(`Error parsing card on ${source.name}`, error);
        }
      }
      
    } catch (error) {
      this.logError(`${source.name} scraping failed`, error);
    }
    
    return events;
  }
}

export default EventSiteScraper;
