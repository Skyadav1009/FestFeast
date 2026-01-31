/**
 * Cron Service
 * Handles scheduled tasks using node-cron
 */

import cron from 'node-cron';
import scraperService from './scraperService.js';
import Event from '../models/Event.js';
import logger from '../utils/logger.js';

class CronService {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    if (this.isInitialized) {
      logger.warn('Cron service already initialized');
      return;
    }

    logger.info('Initializing cron jobs...');

    // Main scraper job - configurable interval
    // Use SCRAPE_INTERVAL_MINUTES for minute intervals, or SCRAPE_INTERVAL_HOURS for hours
    const scrapeIntervalMinutes = process.env.SCRAPE_INTERVAL_MINUTES;
    const scrapeIntervalHours = process.env.SCRAPE_INTERVAL_HOURS || 6;
    
    let cronExpression;
    let intervalLabel;
    
    if (scrapeIntervalMinutes) {
      // Run every X minutes
      cronExpression = `*/${scrapeIntervalMinutes} * * * *`;
      intervalLabel = `Every ${scrapeIntervalMinutes} minutes`;
    } else {
      // Run every X hours (default)
      cronExpression = `0 */${scrapeIntervalHours} * * *`;
      intervalLabel = `Every ${scrapeIntervalHours} hours`;
    }
    
    const scrapeJob = cron.schedule(cronExpression, async () => {
      logger.info(`[CRON] Running scheduled scrape (${intervalLabel})`);
      try {
        await scraperService.runAll();
      } catch (error) {
        logger.error(`[CRON] Scheduled scrape failed: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'scraper', job: scrapeJob, interval: intervalLabel });

    // Auto-expire events - daily at midnight
    const expireJob = cron.schedule('0 0 * * *', async () => {
      logger.info('[CRON] Running daily event expiry check');
      try {
        const expiredCount = await Event.autoExpireEvents();
        logger.info(`[CRON] Expired ${expiredCount} events`);
      } catch (error) {
        logger.error(`[CRON] Event expiry failed: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'expiry', job: expireJob, interval: 'Daily at midnight' });

    // Health check log - every hour
    const healthJob = cron.schedule('0 * * * *', () => {
      const status = scraperService.getStatus();
      logger.debug(`[CRON] Health check - Scraper runs: ${status.stats.totalRuns}, Last run: ${status.lastRun || 'Never'}`);
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });
    
    this.jobs.push({ name: 'health', job: healthJob, interval: 'Every hour' });

    this.isInitialized = true;
    logger.info(`Cron service initialized with ${this.jobs.length} jobs`);
    
    // Log registered jobs
    this.jobs.forEach(({ name, interval }) => {
      logger.info(`  - ${name}: ${interval}`);
    });
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    logger.info('Stopping all cron jobs...');
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      logger.info(`  - Stopped: ${name}`);
    });
    this.isInitialized = false;
  }

  /**
   * Get status of all jobs
   * @returns {Object}
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      jobs: this.jobs.map(({ name, interval }) => ({
        name,
        interval,
        running: this.isInitialized
      })),
      scraperStatus: scraperService.getStatus()
    };
  }

  /**
   * Manually trigger a job
   * @param {string} jobName - Name of job to trigger
   */
  async triggerJob(jobName) {
    switch (jobName) {
      case 'scraper':
        return await scraperService.runAll();
      case 'expiry':
        return await Event.autoExpireEvents();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Singleton instance
const cronService = new CronService();

export default cronService;
