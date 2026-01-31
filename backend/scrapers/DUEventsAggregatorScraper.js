/**
 * DU Events Aggregator Scraper
 * Scrapes from reliable sources that aggregate Delhi University events
 * More reliable than Instagram which blocks scrapers
 */

import BaseScraper from './BaseScraper.js';
import { scraperLogger as logger } from '../utils/logger.js';
import { parseFlexibleDate, categorizeEvent, extractTags, sleep } from '../utils/helpers.js';

class DUEventsAggregatorScraper extends BaseScraper {
  constructor() {
    super('DUEventsAggregatorScraper');
    
    // Reliable sources for DU events (these actually work)
    this.sources = [
      {
        name: 'DU Beat',
        url: 'https://dubeat.com/category/events/',
        type: 'news'
      },
      {
        name: 'DU Express',
        url: 'https://duexpress.in/category/events/',
        type: 'news'
      },
      {
        name: 'DU Updates',
        url: 'https://duupdates.in/events/',
        type: 'listing'
      },
      {
        name: 'Knocksense Delhi',
        url: 'https://www.knocksense.com/delhi/events',
        type: 'listing'
      },
      {
        name: 'Allevents Delhi',
        url: 'https://allevents.in/delhi/all',
        type: 'listing'
      },
      {
        name: 'Insider Events',
        url: 'https://insider.in/delhi-ncr/college-events',
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
        
        switch (source.name) {
          case 'DU Beat':
            events = await this.scrapeDUBeat();
            break;
          case 'DU Express':
            events = await this.scrapeDUExpress();
            break;
          case 'Allevents Delhi':
            events = await this.scrapeAllEvents();
            break;
          case 'Insider Events':
            events = await this.scrapeInsider();
            break;
          case 'Knocksense Delhi':
            events = await this.scrapeKnocksense();
            break;
          default:
            events = await this.scrapeGenericNews(source.url, source.name);
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
   * Scrape DU Beat - Popular DU news site
   */
  async scrapeDUBeat() {
    const events = [];
    
    try {
      await this.navigate('https://dubeat.com/category/events/');
      await this.waitForSelector('article, .post, .entry', 8000);
      
      const articles = await this.page.$$('article, .post-item, .entry');
      logger.info(`[${this.name}] Found ${articles.length} articles on DU Beat`);
      
      for (const article of articles.slice(0, 10)) {
        try {
          const title = await article.$eval(
            'h2 a, .entry-title a, .post-title a',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await article.$eval(
            'h2 a, .entry-title a, .post-title a',
            el => el.href
          ).catch(() => null);
          
          const excerpt = await article.$eval(
            '.excerpt, .entry-summary, .post-excerpt, p',
            el => el.textContent?.trim()
          ).catch(() => '');
          
          const dateText = await article.$eval(
            '.date, .entry-date, time, .post-date',
            el => el.textContent?.trim() || el.getAttribute('datetime')
          ).catch(() => null);
          
          if (title && link && this.isEventRelated(title)) {
            events.push({
              title: this.cleanTitle(title),
              description: excerpt,
              sourceUrl: link,
              sourceType: 'scraped',
              organizer: 'DU Beat',
              location: 'Delhi University',
              mode: 'offline',
              startDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
              tags: extractTags(title + ' ' + excerpt),
              ticketLink: link,
              entryFee: 'Check link for details',
              status: 'published'
            });
          }
        } catch (e) {
          // Skip this article
        }
      }
    } catch (error) {
      this.logError('DU Beat scraping failed', error);
    }
    
    return events;
  }

  /**
   * Scrape DU Express
   */
  async scrapeDUExpress() {
    const events = [];
    
    try {
      await this.navigate('https://duexpress.in/category/events/');
      await this.waitForSelector('article, .post', 8000);
      
      const articles = await this.page.$$('article, .post');
      logger.info(`[${this.name}] Found ${articles.length} articles on DU Express`);
      
      for (const article of articles.slice(0, 10)) {
        try {
          const title = await article.$eval(
            'h2 a, .entry-title a, a.title',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await article.$eval(
            'h2 a, .entry-title a, a.title',
            el => el.href
          ).catch(() => null);
          
          if (title && link && this.isEventRelated(title)) {
            events.push({
              title: this.cleanTitle(title),
              description: `Event from DU Express: ${title}`,
              sourceUrl: link,
              sourceType: 'scraped',
              organizer: 'DU Express',
              location: 'Delhi University',
              mode: 'offline',
              startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
              tags: extractTags(title),
              ticketLink: link,
              entryFee: 'Check link for details',
              status: 'published'
            });
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (error) {
      this.logError('DU Express scraping failed', error);
    }
    
    return events;
  }

  /**
   * Scrape AllEvents.in
   */
  async scrapeAllEvents() {
    const events = [];
    
    try {
      await this.navigate('https://allevents.in/delhi/all');
      await this.waitForSelector('.event-card, .event-item, [class*="event"]', 10000);
      
      // AllEvents has structured event cards
      const cards = await this.page.$$('.event-card, .event-item, li[itemtype*="Event"]');
      logger.info(`[${this.name}] Found ${cards.length} events on AllEvents`);
      
      for (const card of cards.slice(0, 15)) {
        try {
          const title = await card.$eval(
            'h3, h2, .event-title, [itemprop="name"]',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await card.$eval('a', el => el.href).catch(() => null);
          
          const venue = await card.$eval(
            '.venue, .location, [itemprop="location"]',
            el => el.textContent?.trim()
          ).catch(() => 'Delhi');
          
          const dateText = await card.$eval(
            '.date, time, [itemprop="startDate"]',
            el => el.textContent?.trim() || el.getAttribute('datetime')
          ).catch(() => null);
          
          const priceText = await card.$eval(
            '.price, .ticket-price, [itemprop="price"]',
            el => el.textContent?.trim()
          ).catch(() => 'Check link');
          
          if (title && link) {
            // Filter for college/fest events
            const isCollegeEvent = /fest|college|university|campus|du\s|delhi\s*university|srcc|hansraj|hindu|stephens|ramjas|miranda|lsr|venky|kirori/i.test(title + venue);
            
            if (isCollegeEvent) {
              events.push({
                title: this.cleanTitle(title),
                description: `${title} at ${venue}`,
                sourceUrl: link,
                sourceType: 'scraped',
                organizer: 'AllEvents.in',
                location: venue || 'Delhi',
                mode: 'offline',
                startDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
                tags: extractTags(title),
                ticketLink: link,
                entryFee: priceText,
                status: 'published'
              });
            }
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (error) {
      this.logError('AllEvents scraping failed', error);
    }
    
    return events;
  }

  /**
   * Scrape Insider.in college events
   */
  async scrapeInsider() {
    const events = [];
    
    try {
      await this.navigate('https://insider.in/delhi-ncr');
      await this.waitForSelector('[class*="card"], [class*="event"]', 10000);
      
      // Scroll to load more
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 800));
        await sleep(1000);
      }
      
      const cards = await this.page.$$('[class*="EventCard"], [class*="event-card"], article');
      logger.info(`[${this.name}] Found ${cards.length} events on Insider`);
      
      for (const card of cards.slice(0, 15)) {
        try {
          const title = await card.$eval(
            'h3, h2, [class*="title"]',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await card.$eval('a', el => el.href).catch(() => null);
          
          const venue = await card.$eval(
            '[class*="venue"], [class*="location"]',
            el => el.textContent?.trim()
          ).catch(() => 'Delhi NCR');
          
          const dateText = await card.$eval(
            '[class*="date"], time',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          if (title && link) {
            events.push({
              title: this.cleanTitle(title),
              description: `${title} at ${venue}`,
              sourceUrl: link,
              sourceType: 'scraped',
              organizer: 'Insider.in',
              location: venue,
              mode: 'offline',
              startDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: dateText ? parseFlexibleDate(dateText) : new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
              tags: extractTags(title),
              ticketLink: link,
              entryFee: 'Check link',
              status: 'published'
            });
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (error) {
      this.logError('Insider scraping failed', error);
    }
    
    return events;
  }

  /**
   * Scrape Knocksense
   */
  async scrapeKnocksense() {
    const events = [];
    
    try {
      await this.navigate('https://www.knocksense.com/delhi/whats-happening-in-delhi');
      await this.waitForSelector('article, .post, .card', 8000);
      
      const cards = await this.page.$$('article, .card, .post');
      logger.info(`[${this.name}] Found ${cards.length} items on Knocksense`);
      
      for (const card of cards.slice(0, 10)) {
        try {
          const title = await card.$eval(
            'h2, h3, .title',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await card.$eval('a', el => el.href).catch(() => null);
          
          if (title && link && this.isEventRelated(title)) {
            events.push({
              title: this.cleanTitle(title),
              description: title,
              sourceUrl: link,
              sourceType: 'scraped',
              organizer: 'Knocksense',
              location: 'Delhi',
              mode: 'offline',
              startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
              tags: extractTags(title),
              ticketLink: link,
              entryFee: 'Check link',
              status: 'published'
            });
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (error) {
      this.logError('Knocksense scraping failed', error);
    }
    
    return events;
  }

  /**
   * Generic news site scraper
   */
  async scrapeGenericNews(url, sourceName) {
    const events = [];
    
    try {
      await this.navigate(url);
      await this.waitForSelector('article, .post, .entry', 8000);
      
      const articles = await this.page.$$('article, .post, .entry');
      
      for (const article of articles.slice(0, 10)) {
        try {
          const title = await article.$eval(
            'h2 a, h3 a, .title a',
            el => el.textContent?.trim()
          ).catch(() => null);
          
          const link = await article.$eval(
            'h2 a, h3 a, .title a, a',
            el => el.href
          ).catch(() => null);
          
          if (title && link && this.isEventRelated(title)) {
            events.push({
              title: this.cleanTitle(title),
              description: `Event from ${sourceName}`,
              sourceUrl: link,
              sourceType: 'scraped',
              organizer: sourceName,
              location: 'Delhi University',
              mode: 'offline',
              startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
              tags: extractTags(title),
              ticketLink: link,
              entryFee: 'Check link',
              status: 'published'
            });
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (error) {
      this.logError(`Generic scraping failed for ${sourceName}`, error);
    }
    
    return events;
  }

  /**
   * Check if title is event-related
   */
  isEventRelated(title) {
    const eventKeywords = /fest|event|concert|show|night|performance|competition|hackathon|workshop|seminar|conference|carnival|mela|fair|celebration|launch|meetup|summit/i;
    return eventKeywords.test(title);
  }

  /**
   * Clean and normalize title
   */
  cleanTitle(title) {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[\[\]]/g, '')
      .trim()
      .substring(0, 200);
  }
}

export default DUEventsAggregatorScraper;
