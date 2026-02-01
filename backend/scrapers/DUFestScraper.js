/**
 * DU Fest Scraper
 * Scrapes Delhi University college fest announcements
 * Sources: Devfolio, Eventbrite, AllEvents (working alternatives)
 */

import BaseScraper from './BaseScraper.js';
import { scraperLogger as logger } from '../utils/logger.js';
import { parseFlexibleDate, categorizeEvent, extractTags, sleep } from '../utils/helpers.js';

class DUFestScraper extends BaseScraper {
  constructor() {
    super('DUFestScraper');

    // DU College fest sources
    // NOTE: Unstop and Dare2Compete now require login, using alternatives
    this.sources = [
      {
        name: 'Devfolio Fests',
        url: 'https://devfolio.co/hackathons',
        type: 'listing'
      },
      {
        name: 'Eventbrite Delhi Fests',
        url: 'https://www.eventbrite.com/d/india--new-delhi/college/',
        type: 'listing'
      },
      {
        name: 'AllEvents College',
        url: 'https://allevents.in/delhi/college',
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
          case 'Devfolio Fests':
            events = await this.scrapeDevfolioFests();
            break;
          case 'Eventbrite Delhi Fests':
            events = await this.scrapeEventbriteFests();
            break;
          case 'AllEvents College':
            events = await this.scrapeAllEventsCollege();
            break;
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
   * Scrape Devfolio for college fests/hackathons
   */
  async scrapeDevfolioFests() {
    const events = [];

    try {
      await this.navigate('https://devfolio.co/hackathons');

      // Wait for hackathon cards to load
      await this.waitForSelector('[class*="HackathonCard"], [class*="Card"]', 10000);

      // Scroll to load more
      for (let i = 0; i < 2; i++) {
        await this.page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(1000);
      }

      const cards = await this.page.$$('[class*="HackathonCard"], [class*="Card"]');
      logger.info(`[${this.name}] Found ${cards.length} events on Devfolio`);

      for (const card of cards.slice(0, 15)) {
        try {
          const title = await this.getText('h3, h2, [class*="name"], [class*="title"]', card);
          if (!title || title.length < 5) continue;

          const fullText = await card.textContent() || '';

          // Filter for India/Delhi related events
          const isIndia = /india|delhi|bangalore|mumbai|online|virtual|college|university/i.test(fullText);
          if (!isIndia) continue;

          const dateText = await this.getText('[class*="date"], time', card);
          const location = await this.getText('[class*="location"], [class*="venue"]', card) || 'India';
          let link = await this.getAttribute('a', 'href', card);
          if (!link) link = await card.getAttribute('href');

          const parsedDate = parseFlexibleDate(dateText);
          const eventUrl = link?.startsWith('http') ? link : `https://devfolio.co${link || ''}`;

          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Devfolio',
            link: eventUrl,
            source: 'Devfolio',
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: ['College Fest', ...extractTags(title, fullText)],
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: 'Free',
            confidence: 0.85
          });

        } catch (error) {
          this.logError('Error parsing Devfolio card', error);
        }
      }

    } catch (error) {
      this.logError('Devfolio Fests scraping failed', error);
    }

    return events;
  }

  /**
   * Scrape Eventbrite for Delhi college events
   */
  async scrapeEventbriteFests() {
    const events = [];

    try {
      await this.navigate('https://www.eventbrite.com/d/india--new-delhi/college/');

      // Wait for event cards
      await this.waitForSelector('[class*="event-card"], article', 10000);

      // Scroll to load more
      await this.page.evaluate(() => window.scrollBy(0, 1500));
      await sleep(2000);

      const cards = await this.page.$$('[class*="event-card"]');
      logger.info(`[${this.name}] Found ${cards.length} events on Eventbrite`);

      for (const card of cards.slice(0, 20)) {
        try {
          const title = await this.getText('h3, h2, [class*="title"]', card);
          if (!title || title.length < 5) continue;

          const fullText = await card.textContent() || '';
          const dateText = await this.getText('time, [class*="date"]', card);
          const location = await this.getText('[class*="location"], [class*="venue"]', card) || 'Delhi NCR';
          let link = await this.getAttribute('a', 'href', card);

          const parsedDate = parseFlexibleDate(dateText);
          const eventUrl = link?.startsWith('http') ? link : `https://www.eventbrite.com${link || ''}`;

          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'Eventbrite',
            link: eventUrl,
            source: 'Eventbrite',
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: extractTags(title, fullText),
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: fullText.toLowerCase().includes('free') ? 'Free' : 'Check website',
            confidence: 0.8
          });

        } catch (error) {
          this.logError('Error parsing Eventbrite card', error);
        }
      }

    } catch (error) {
      this.logError('Eventbrite Fests scraping failed', error);
    }

    return events;
  }

  /**
   * Scrape AllEvents for college events in Delhi
   */
  async scrapeAllEventsCollege() {
    const events = [];

    try {
      await this.navigate('https://allevents.in/delhi/college');

      // Wait for event cards
      await this.waitForSelector('.event-card, .event-item, article', 10000);

      // Scroll to load more
      await this.page.evaluate(() => window.scrollBy(0, 1000));
      await sleep(1000);

      const cards = await this.page.$$('.event-card');
      logger.info(`[${this.name}] Found ${cards.length} events on AllEvents College`);

      for (const card of cards.slice(0, 20)) {
        try {
          const title = await this.getText('h3, h2, .title', card);
          if (!title || title.length < 5) continue;

          const fullText = await card.textContent() || '';

          // Filter for Delhi NCR related events
          const isDelhiNCR = /delhi|ncr|gurgaon|noida|du |hindu|srcc|stephens|hansraj|ramjas|lsr|venky|gargi|miranda|dtu|nsit|iiit|igdtuw/i.test(fullText);

          const dateText = await this.getText('[class*="date"], .date, time', card);
          const location = await this.getText('[class*="location"], .location, .venue', card) || 'Delhi NCR';
          const link = await this.getAttribute('a', 'href', card);

          const parsedDate = parseFlexibleDate(dateText);

          events.push({
            title: title.trim(),
            description: '',
            date: dateText || null,
            startDate: parsedDate,
            endDate: parsedDate,
            location: location.trim(),
            venue: location.trim(),
            organizer: 'AllEvents',
            link: link?.startsWith('http') ? link : `https://allevents.in${link || ''}`,
            source: 'AllEvents',
            sourceType: 'scraper',
            category: categorizeEvent(title, fullText),
            tags: extractTags(title, fullText),
            mode: fullText.toLowerCase().includes('online') ? 'Online' : 'Offline',
            entryFee: fullText.toLowerCase().includes('free') ? 'Free' : 'Check website',
            confidence: isDelhiNCR ? 0.9 : 0.6
          });

        } catch (error) {
          this.logError('Error parsing AllEvents card', error);
        }
      }

    } catch (error) {
      this.logError('AllEvents College scraping failed', error);
    }

    return events;
  }
}

export default DUFestScraper;
