/**
 * Manual Scraper Runner Script
 * Run this directly to trigger scrapers without the server
 * 
 * Usage: node scripts/runScraper.js [scraperName]
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import scraperService from '../services/scraperService.js';
import logger from '../utils/logger.js';

const run = async () => {
  const scraperName = process.argv[2];
  
  logger.info('='.repeat(50));
  logger.info('FestFeast Manual Scraper Runner');
  logger.info('='.repeat(50));
  
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not set in environment');
    }
    
    await mongoose.connect(uri);
    logger.info('Connected to MongoDB');
    
    let result;
    
    if (scraperName) {
      // Run specific scraper
      logger.info(`Running scraper: ${scraperName}`);
      result = await scraperService.runScraper(scraperName);
    } else {
      // Run all scrapers
      logger.info('Running all scrapers...');
      result = await scraperService.runAll();
    }
    
    logger.info('Scraper completed!');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    logger.error(`Scraper failed: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  }
};

run();
