/**
 * Scraper Service
 * Orchestrates all scrapers and handles event storage
 */

import Event from '../models/Event.js';
import {
  DUFestScraper,
  EventSiteScraper,
  InstagramScraper,
  HackathonScraper,
  DUEventsAggregatorScraper
} from '../scrapers/index.js';
import logger from '../utils/logger.js';
import { recordSuccess, recordFailure, getHealthStatus, generateHealthReport } from '../utils/healthMonitor.js';

class ScraperService {
  constructor() {
    // Initialize all scrapers
    this.scrapers = [
      new DUFestScraper(),
      new EventSiteScraper(),
      new HackathonScraper(),
      new DUEventsAggregatorScraper(), // DU events from aggregator sites
      // InstagramScraper is limited without API access, enable if needed
      // new InstagramScraper()
    ];

    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      totalEventsScraped: 0,
      totalNewEvents: 0,
      totalDuplicates: 0,
      totalErrors: 0
    };
  }

  /**
   * Run all scrapers and store results
   * @returns {Promise<Object>} Scraping results summary
   */
  async runAll() {
    if (this.isRunning) {
      logger.warn('Scraper already running, skipping...');
      return {
        success: false,
        message: 'Scraper already in progress'
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    const results = {
      success: true,
      startedAt: new Date().toISOString(),
      scrapers: [],
      totals: {
        eventsFound: 0,
        newEvents: 0,
        duplicates: 0,
        errors: 0
      }
    };

    logger.info('='.repeat(50));
    logger.info('Starting scraper run...');
    logger.info('='.repeat(50));

    try {
      // Run scrapers sequentially to avoid resource contention
      for (const scraper of this.scrapers) {
        try {
          const scraperResult = await scraper.run();

          // Process and store events
          const storageResult = await this.storeEvents(scraperResult.results);

          // Record success in health monitor
          recordSuccess(scraperResult.meta.scraper, scraperResult.meta.eventsFound);

          results.scrapers.push({
            name: scraperResult.meta.scraper,
            duration: scraperResult.meta.duration,
            eventsFound: scraperResult.meta.eventsFound,
            newEvents: storageResult.newCount,
            duplicates: storageResult.duplicateCount,
            errors: scraperResult.meta.errorsCount
          });

          results.totals.eventsFound += scraperResult.meta.eventsFound;
          results.totals.newEvents += storageResult.newCount;
          results.totals.duplicates += storageResult.duplicateCount;
          results.totals.errors += scraperResult.meta.errorsCount;

        } catch (error) {
          logger.error(`Scraper ${scraper.name} failed: ${error.message}`);

          // Record failure in health monitor
          recordFailure(scraper.name, error.message);

          results.scrapers.push({
            name: scraper.name,
            error: error.message
          });
          results.totals.errors++;
        }
      }

      // Auto-expire old events
      const expiredCount = await Event.autoExpireEvents();
      if (expiredCount > 0) {
        logger.info(`Auto-expired ${expiredCount} events`);
      }

      // Update stats
      this.stats.totalRuns++;
      this.stats.totalEventsScraped += results.totals.eventsFound;
      this.stats.totalNewEvents += results.totals.newEvents;
      this.stats.totalDuplicates += results.totals.duplicates;
      this.stats.totalErrors += results.totals.errors;

      this.lastRun = new Date();

    } catch (error) {
      logger.error(`Scraper run failed: ${error.message}`);
      results.success = false;
      results.error = error.message;
    } finally {
      this.isRunning = false;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    results.duration = parseFloat(duration);
    results.completedAt = new Date().toISOString();

    logger.info('='.repeat(50));
    logger.info(`Scraper run completed in ${duration}s`);
    logger.info(`Found: ${results.totals.eventsFound} | New: ${results.totals.newEvents} | Duplicates: ${results.totals.duplicates}`);
    logger.info('='.repeat(50));

    return results;
  }

  /**
   * Store scraped events with deduplication
   * @param {Array} events - Array of event objects
   * @returns {Promise<Object>} Storage results
   */
  async storeEvents(events) {
    let newCount = 0;
    let duplicateCount = 0;
    const stored = [];

    for (const eventData of events) {
      try {
        // Skip if no title
        if (!eventData.title) continue;

        const { event, isNew } = await Event.findOrCreate(eventData);

        if (isNew) {
          newCount++;
          stored.push(event);
          logger.debug(`New event stored: ${event.title}`);
        } else {
          duplicateCount++;
        }

      } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          logger.error(`Failed to store event: ${error.message}`);
        }
      }
    }

    return { newCount, duplicateCount, stored };
  }

  /**
   * Run a specific scraper by name
   * @param {string} scraperName - Name of scraper to run
   * @returns {Promise<Object>}
   */
  async runScraper(scraperName) {
    const scraper = this.scrapers.find(s =>
      s.name.toLowerCase() === scraperName.toLowerCase()
    );

    if (!scraper) {
      return {
        success: false,
        error: `Scraper '${scraperName}' not found`
      };
    }

    logger.info(`Running single scraper: ${scraperName}`);

    try {
      const result = await scraper.run();
      const storageResult = await this.storeEvents(result.results);

      // Record success
      recordSuccess(scraperName, result.meta.eventsFound);

      return {
        success: true,
        scraper: scraperName,
        eventsFound: result.meta.eventsFound,
        newEvents: storageResult.newCount,
        duplicates: storageResult.duplicateCount,
        errors: result.errors
      };
    } catch (error) {
      // Record failure
      recordFailure(scraperName, error.message);

      return {
        success: false,
        scraper: scraperName,
        error: error.message
      };
    }
  }

  /**
   * Get service status including health metrics
   * @returns {Object}
   */
  getStatus() {
    const health = getHealthStatus();

    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      stats: this.stats,
      scrapers: this.scrapers.map(s => s.name),
      health: {
        status: health.status,
        summary: health.summary,
        recentAlerts: health.recentAlerts
      }
    };
  }

  /**
   * Get detailed health report
   * @returns {string}
   */
  getHealthReport() {
    return generateHealthReport();
  }
}

// Singleton instance
const scraperService = new ScraperService();

export default scraperService;
