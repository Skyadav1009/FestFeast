/**
 * Quick scraper test - runs one scraper to verify it works
 */

import DUEventsAggregatorScraper from '../scrapers/DUEventsAggregatorScraper.js';
import fs from 'fs';

console.log('🚀 Testing DUEventsAggregatorScraper...\n');

const scraper = new DUEventsAggregatorScraper();

try {
  const result = await scraper.run();
  const events = result.results || [];
  
  console.log(`\n✅ Scraping complete!`);
  console.log(`📊 Found ${events.length} events\n`);
  
  if (events.length > 0) {
    console.log('📋 Sample events:');
    console.log('─'.repeat(60));
    
    events.slice(0, 5).forEach((event, i) => {
      console.log(`\n${i + 1}. ${event.title}`);
      console.log(`   📍 ${event.location}`);
      console.log(`   🔗 ${event.sourceUrl}`);
      console.log(`   🏷️  ${event.tags?.join(', ') || 'No tags'}`);
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`\n📁 Full results saved to: test-results.json`);
    
    // Save full results
    fs.writeFileSync('test-results.json', JSON.stringify(events, null, 2));
    
  } else {
    console.log('⚠️ No events found. Sites may have changed or be unavailable.');
  }
  
} catch (error) {
  console.error('❌ Scraper test failed:', error.message);
  console.error(error.stack);
}

process.exit(0);
