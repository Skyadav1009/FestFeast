/**
 * Seed events to MongoDB
 * Run this to populate the database with scraped events
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import DUEventsAggregatorScraper from '../scrapers/DUEventsAggregatorScraper.js';
import Event from '../models/Event.js';

console.log('🚀 Seeding events to MongoDB...\n');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// Run scraper
const scraper = new DUEventsAggregatorScraper();
const result = await scraper.run();
const events = result.results || [];

console.log(`\n📊 Scraped ${events.length} events\n`);

// Store events
let newCount = 0;
let duplicateCount = 0;

for (const eventData of events) {
  try {
    if (!eventData.title) continue;
    
    // Map scraper output to Event model
    const eventToStore = {
      title: eventData.title,
      description: eventData.description || '',
      startDate: eventData.startDate ? new Date(eventData.startDate) : null,
      endDate: eventData.endDate ? new Date(eventData.endDate) : null,
      location: eventData.location || 'Delhi NCR',
      organizer: eventData.organizer || '',
      source: eventData.organizer || eventData.sourceType || 'DUEventsAggregator',
      sourceType: 'scraper',
      link: eventData.sourceUrl || eventData.ticketLink || '',
      ticketLink: eventData.ticketLink || eventData.sourceUrl || '',
      tags: eventData.tags || [],
      entryFee: eventData.entryFee || 'Check link',
      mode: eventData.mode === 'offline' ? 'Offline' : (eventData.mode === 'online' ? 'Online' : 'Offline'),
      status: 'published',
      category: 'fest'
    };
    
    const { event, isNew } = await Event.findOrCreate(eventToStore);
    
    if (isNew) {
      newCount++;
      console.log(`✅ Added: ${event.title}`);
    } else {
      duplicateCount++;
      console.log(`⏭️ Duplicate: ${event.title}`);
    }
    
  } catch (error) {
    if (error.code === 11000) {
      duplicateCount++;
    } else {
      console.error(`❌ Error storing event: ${error.message}`);
    }
  }
}

console.log('\n' + '─'.repeat(60));
console.log(`\n📊 Results:`);
console.log(`   New events added: ${newCount}`);
console.log(`   Duplicates skipped: ${duplicateCount}`);

// Show total events in DB
const totalEvents = await Event.countDocuments({ status: 'published' });
console.log(`\n📦 Total published events in database: ${totalEvents}`);

await mongoose.disconnect();
console.log('\n✅ Done! Events are now in your MongoDB.\n');
process.exit(0);
