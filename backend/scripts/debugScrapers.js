/**
 * Debug Scrapers - Test scrapers without MongoDB
 * Usage: node scripts/debugScrapers.js [scraperName]
 */

import 'dotenv/config';
import { chromium } from 'playwright';

// Test individual scraper sources
const testSources = async () => {
  const scraperName = process.argv[2] || 'all';
  
  console.log('='.repeat(60));
  console.log('FestFeast Scraper Debug Tool');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  const results = {};
  
  // Define all sources to test
  const sources = {
    // HackathonScraper sources
    'devfolio': {
      url: 'https://devfolio.co/hackathons',
      selectors: ['[class*="HackathonCard"]', '.hackathon-card', 'a[href*="/hackathons/"]', '[class*="Card"]'],
      scraper: 'HackathonScraper'
    },
    'mlh': {
      url: 'https://mlh.io/seasons/2025/events',
      selectors: ['.event', '.event-card', 'article', '[class*="Event"]'],
      scraper: 'HackathonScraper'
    },
    'devpost': {
      url: 'https://devpost.com/hackathons?location=India&status=open',
      selectors: ['.hackathon-tile', 'article', '.challenge-listing', '[class*="hackathon"]'],
      scraper: 'HackathonScraper'
    },
    // DUFestScraper sources
    'unstop': {
      url: 'https://unstop.com/college-fests',
      selectors: ['.fest-card', '.opportunity-card', '[class*="festival"]', '.MuiCard-root', 'article'],
      scraper: 'DUFestScraper'
    },
    'dare2compete': {
      url: 'https://dare2compete.com/festival',
      selectors: ['.festival-card', '.event-card', 'article', '.card'],
      scraper: 'DUFestScraper'
    },
    // EventSiteScraper sources
    'allevents': {
      url: 'https://allevents.in/delhi/all',
      selectors: ['.event-card', '.event-item', 'article', 'li[itemtype*="Event"]'],
      scraper: 'EventSiteScraper'
    },
    'eventbrite': {
      url: 'https://www.eventbrite.com/d/india--new-delhi/events/',
      selectors: ['[data-testid="event-card"]', '.eds-event-card', 'article', '[class*="event-card"]'],
      scraper: 'EventSiteScraper'
    },
    'insider': {
      url: 'https://insider.in/delhi-ncr',
      selectors: ['[class*="EventCard"]', '[class*="event-card"]', 'article', '.card'],
      scraper: 'EventSiteScraper'
    },
    // DUEventsAggregatorScraper sources
    'dubeat': {
      url: 'https://dubeat.com/category/events/',
      selectors: ['article', '.post-item', '.entry', '.post'],
      scraper: 'DUEventsAggregatorScraper'
    },
    'duexpress': {
      url: 'https://duexpress.in/category/events/',
      selectors: ['article', '.post', '.entry'],
      scraper: 'DUEventsAggregatorScraper'
    },
    'knocksense': {
      url: 'https://www.knocksense.com/delhi/whats-happening-in-delhi',
      selectors: ['article', '.post', '.card'],
      scraper: 'DUEventsAggregatorScraper'
    },
    'delhievents': {
      url: 'https://www.delhievents.com/',
      selectors: ['.event-card', '.event-item', 'article', '.card', '.listing-item'],
      scraper: 'DUEventsAggregatorScraper'
    }
  };
  
  const sourcesToTest = scraperName === 'all' 
    ? Object.keys(sources) 
    : [scraperName.toLowerCase()];
  
  for (const sourceName of sourcesToTest) {
    const source = sources[sourceName];
    if (!source) {
      console.log(`\n❌ Unknown source: ${sourceName}`);
      continue;
    }
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔍 Testing: ${sourceName.toUpperCase()}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Scraper: ${source.scraper}`);
    console.log('─'.repeat(60));
    
    const result = {
      source: sourceName,
      url: source.url,
      scraper: source.scraper,
      success: false,
      error: null,
      cardsFound: 0,
      workingSelector: null,
      selectorResults: {},
      sampleData: []
    };
    
    try {
      // Navigate to URL
      console.log(`   ⏳ Navigating...`);
      const response = await page.goto(source.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Check HTTP status
      const status = response?.status() || 0;
      console.log(`   📡 HTTP Status: ${status}`);
      
      if (status >= 400) {
        result.error = `HTTP ${status} error`;
        console.log(`   ❌ ${result.error}`);
        results[sourceName] = result;
        continue;
      }
      
      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);
      
      // Scroll to load lazy content
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(1000);
      
      // Test each selector
      console.log(`   🎯 Testing selectors...`);
      for (const selector of source.selectors) {
        const cards = await page.$$(selector);
        result.selectorResults[selector] = cards.length;
        console.log(`      ${selector}: ${cards.length} found`);
        
        if (cards.length > result.cardsFound) {
          result.cardsFound = cards.length;
          result.workingSelector = selector;
        }
      }
      
      if (result.cardsFound > 0) {
        result.success = true;
        console.log(`   ✅ Best selector: "${result.workingSelector}" (${result.cardsFound} cards)`);
        
        // Extract sample data from first 3 cards
        const cards = await page.$$(result.workingSelector);
        for (const card of cards.slice(0, 3)) {
          try {
            const sampleCard = {};
            
            // Try to extract title
            for (const titleSel of ['h2', 'h3', 'h4', '[class*="title"]', '[class*="name"]', 'a']) {
              const titleEl = await card.$(titleSel);
              if (titleEl) {
                const text = await titleEl.textContent();
                if (text && text.trim().length > 3) {
                  sampleCard.title = text.trim().substring(0, 80);
                  sampleCard.titleSelector = titleSel;
                  break;
                }
              }
            }
            
            // Try to extract link
            const linkEl = await card.$('a');
            if (linkEl) {
              sampleCard.link = await linkEl.getAttribute('href');
            }
            
            // Try to extract date
            for (const dateSel of ['time', '[class*="date"]', '.date', '[datetime]']) {
              const dateEl = await card.$(dateSel);
              if (dateEl) {
                const text = await dateEl.textContent();
                if (text && text.trim().length > 2) {
                  sampleCard.date = text.trim().substring(0, 50);
                  sampleCard.dateSelector = dateSel;
                  break;
                }
              }
            }
            
            if (sampleCard.title) {
              result.sampleData.push(sampleCard);
            }
          } catch (e) {
            // Skip this card
          }
        }
        
        // Show sample data
        if (result.sampleData.length > 0) {
          console.log(`   📋 Sample data:`);
          for (const sample of result.sampleData) {
            console.log(`      - "${sample.title}"`);
            if (sample.date) console.log(`        Date: ${sample.date}`);
          }
        }
      } else {
        console.log(`   ⚠️ No cards found with any selector!`);
        
        // Try to find what elements ARE on the page
        console.log(`   🔎 Analyzing page structure...`);
        
        // Check for common patterns
        const bodyText = await page.evaluate(() => document.body.innerText?.substring(0, 500));
        console.log(`   📄 Page content preview: "${bodyText?.substring(0, 200)}..."`);
        
        // Check for login walls or captchas
        const hasLogin = await page.$('input[type="password"], [class*="login"], [class*="signin"]');
        if (hasLogin) {
          result.error = 'Login wall detected';
          console.log(`   🚫 Login wall detected!`);
        }
        
        const hasCaptcha = await page.$('[class*="captcha"], [class*="recaptcha"]');
        if (hasCaptcha) {
          result.error = 'CAPTCHA detected';
          console.log(`   🚫 CAPTCHA detected!`);
        }
      }
      
    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    results[sourceName] = result;
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const working = [];
  const failing = [];
  
  for (const [name, result] of Object.entries(results)) {
    if (result.success) {
      working.push({ name, cards: result.cardsFound, selector: result.workingSelector });
    } else {
      failing.push({ name, error: result.error || 'No cards found' });
    }
  }
  
  console.log('\n✅ WORKING SOURCES:');
  if (working.length === 0) {
    console.log('   None');
  }
  for (const w of working) {
    console.log(`   • ${w.name}: ${w.cards} cards (${w.selector})`);
  }
  
  console.log('\n❌ FAILING SOURCES:');
  if (failing.length === 0) {
    console.log('   None');
  }
  for (const f of failing) {
    console.log(`   • ${f.name}: ${f.error}`);
  }
  
  // Write detailed results to file
  const fs = await import('fs/promises');
  await fs.writeFile(
    'debug-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('\n📁 Detailed results saved to debug-results.json');
  
  console.log('\n' + '='.repeat(60));
};

testSources().catch(console.error);
