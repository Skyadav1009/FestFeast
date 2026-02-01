/**
 * Validation Cron Job
 * Runs weekly source validation to detect broken scrapers early
 */

import cron from 'node-cron';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { recordSuccess, recordFailure, generateHealthReport, clearOldAlerts } from '../utils/healthMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All sources to validate
const SOURCES_TO_VALIDATE = [
    // Hackathon sources
    { name: 'devfolio', url: 'https://devfolio.co/hackathons', selectors: ['[class*="HackathonCard"]', '[class*="Card"]'] },
    { name: 'mlh', url: 'https://mlh.io/seasons/2026/events', selectors: ['.event-wrapper', '[class*="event"]', 'a[href*="/events/"]'] },
    { name: 'devpost', url: 'https://devpost.com/hackathons?location=India', selectors: ['[class*="hackathon"]', '.challenge-listing'] },
    { name: 'hackerearth', url: 'https://www.hackerearth.com/challenges/', selectors: ['[class*="challenge"]', '.challenge-card'] },

    // Event sites
    { name: 'allevents', url: 'https://allevents.in/delhi/all', selectors: ['.event-card'] },
    { name: 'eventbrite', url: 'https://www.eventbrite.com/d/india--new-delhi/events/', selectors: ['[class*="event-card"]'] },
    { name: 'bookmyshow', url: 'https://in.bookmyshow.com/explore/events-delhi-ncr', selectors: ['[class*="card"]', '[class*="event"]'] },

    // DU sources
    { name: 'dubeat', url: 'https://dubeat.com/category/events/', selectors: ['article', '.post'] },
    { name: 'delhievents', url: 'https://www.delhievents.com/', selectors: ['article', '.event-card', '.card'] }
];

/**
 * Validate a single source
 */
async function validateSource(browser, source) {
    const result = {
        name: source.name,
        url: source.url,
        success: false,
        cardsFound: 0,
        workingSelector: null,
        error: null,
        timestamp: new Date().toISOString()
    };

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        const response = await page.goto(source.url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        if (!response) {
            result.error = 'No response received';
            return result;
        }

        const status = response.status();
        if (status >= 400) {
            result.error = `HTTP ${status} error`;
            return result;
        }

        // Check for login walls
        const pageContent = await page.content();
        if (/login|sign\s*in|sign\s*up|authentication/i.test(pageContent) &&
            !/logout|sign\s*out/i.test(pageContent)) {
            const loginForm = await page.$('form[action*="login"], form[action*="signin"], input[type="password"]');
            if (loginForm) {
                result.error = 'Login wall detected';
                return result;
            }
        }

        // Wait for content to load
        await page.waitForTimeout(2000);

        // Test each selector
        for (const selector of source.selectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    result.cardsFound = elements.length;
                    result.workingSelector = selector;
                    result.success = true;
                    break;
                }
            } catch (e) {
                // Selector failed, try next
            }
        }

        if (!result.success && result.cardsFound === 0) {
            result.error = 'No cards found with any selector';
        }

    } catch (error) {
        result.error = error.message;
    } finally {
        await context.close();
    }

    return result;
}

/**
 * Run full validation of all sources
 */
async function runValidation() {
    logger.info('='.repeat(50));
    logger.info('Starting weekly source validation...');
    logger.info('='.repeat(50));

    const browser = await chromium.launch({ headless: true });
    const results = [];

    let successCount = 0;
    let failureCount = 0;

    try {
        for (const source of SOURCES_TO_VALIDATE) {
            logger.info(`Validating: ${source.name}`);

            const result = await validateSource(browser, source);
            results.push(result);

            if (result.success) {
                successCount++;
                recordSuccess(source.name, result.cardsFound);
                logger.info(`  ✅ ${source.name}: Found ${result.cardsFound} cards`);
            } else {
                failureCount++;
                recordFailure(source.name, result.error || 'Unknown error');
                logger.warn(`  ❌ ${source.name}: ${result.error}`);
            }

            // Small delay between sources
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (error) {
        logger.error(`Validation failed: ${error.message}`);
    } finally {
        await browser.close();
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '../data/validation-results.json');
    const dataDir = path.dirname(resultsPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const validationReport = {
        timestamp: new Date().toISOString(),
        summary: {
            total: SOURCES_TO_VALIDATE.length,
            success: successCount,
            failed: failureCount
        },
        results
    };

    fs.writeFileSync(resultsPath, JSON.stringify(validationReport, null, 2));

    // Clear old alerts
    clearOldAlerts();

    // Log summary
    logger.info('='.repeat(50));
    logger.info(`Validation complete: ${successCount} success, ${failureCount} failed`);
    logger.info('='.repeat(50));

    // Log health report if there are issues
    if (failureCount > 0) {
        logger.warn(generateHealthReport());
    }

    return validationReport;
}

/**
 * Schedule weekly validation
 * Runs every Sunday at 3 AM
 */
export function scheduleWeeklyValidation() {
    // Run every Sunday at 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
        logger.info('Running scheduled weekly validation...');
        await runValidation();
    });

    logger.info('Weekly validation scheduled for Sundays at 3:00 AM');
}

/**
 * Run validation immediately (for manual testing)
 */
export async function runValidationNow() {
    return await runValidation();
}

export default {
    scheduleWeeklyValidation,
    runValidationNow,
    runValidation
};
