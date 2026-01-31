/**
 * Base Scraper Class
 * Abstract foundation for all scrapers with common functionality
 */

import { chromium } from 'playwright';
import { scraperLogger as logger } from '../utils/logger.js';
import { sleep, retryWithBackoff } from '../utils/helpers.js';

class BaseScraper {
  constructor(name, options = {}) {
    this.name = name;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
    this.errors = [];
    
    // Default options
    this.options = {
      headless: true,
      timeout: 30000,
      retries: 3,
      ...options
    };
  }

  /**
   * Initialize browser and page
   */
  async init() {
    try {
      logger.info(`[${this.name}] Initializing browser...`);
      
      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US'
      });
      
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.options.timeout);
      
      logger.info(`[${this.name}] Browser initialized successfully`);
      return true;
    } catch (error) {
      logger.error(`[${this.name}] Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to URL with retry logic
   * @param {string} url - Target URL
   */
  async navigate(url) {
    return retryWithBackoff(async () => {
      logger.debug(`[${this.name}] Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout
      });
      await sleep(1000); // Brief wait for dynamic content
    }, this.options.retries);
  }

  /**
   * Safe element text extraction
   * @param {string} selector - CSS selector
   * @param {Element} parent - Optional parent element
   * @returns {Promise<string>}
   */
  async getText(selector, parent = null) {
    try {
      const element = parent 
        ? await parent.$(selector)
        : await this.page.$(selector);
      
      if (!element) return '';
      return (await element.textContent())?.trim() || '';
    } catch {
      return '';
    }
  }

  /**
   * Safe attribute extraction
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @param {Element} parent - Optional parent element
   * @returns {Promise<string>}
   */
  async getAttribute(selector, attribute, parent = null) {
    try {
      const element = parent 
        ? await parent.$(selector)
        : await this.page.$(selector);
      
      if (!element) return '';
      return (await element.getAttribute(attribute)) || '';
    } catch {
      return '';
    }
  }

  /**
   * Wait for selector with fallback
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<boolean>}
   */
  async waitForSelector(selector, timeout = 5000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Abstract method - must be implemented by child classes
   * @returns {Promise<Array>}
   */
  async scrape() {
    throw new Error('scrape() method must be implemented by child class');
  }

  /**
   * Run the scraper with full lifecycle management
   * @returns {Promise<{results: Array, errors: Array}>}
   */
  async run() {
    const startTime = Date.now();
    logger.info(`[${this.name}] Starting scraper...`);
    
    try {
      await this.init();
      this.results = await this.scrape();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[${this.name}] Completed in ${duration}s. Found ${this.results.length} events.`);
      
      return {
        results: this.results,
        errors: this.errors,
        meta: {
          scraper: this.name,
          duration: parseFloat(duration),
          eventsFound: this.results.length,
          errorsCount: this.errors.length
        }
      };
    } catch (error) {
      logger.error(`[${this.name}] Scraper failed: ${error.message}`);
      this.errors.push({
        type: 'fatal',
        message: error.message,
        stack: error.stack
      });
      
      return {
        results: [],
        errors: this.errors,
        meta: {
          scraper: this.name,
          duration: ((Date.now() - startTime) / 1000).toFixed(2),
          eventsFound: 0,
          errorsCount: this.errors.length
        }
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.debug(`[${this.name}] Browser closed`);
      }
    } catch (error) {
      logger.warn(`[${this.name}] Error during cleanup: ${error.message}`);
    }
  }

  /**
   * Log non-fatal error and continue
   * @param {string} context - Error context
   * @param {Error} error - Error object
   */
  logError(context, error) {
    logger.warn(`[${this.name}] ${context}: ${error.message}`);
    this.errors.push({
      type: 'non-fatal',
      context,
      message: error.message
    });
  }
}

export default BaseScraper;
