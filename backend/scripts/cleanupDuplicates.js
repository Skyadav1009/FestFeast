/**
 * Cleanup Duplicate Events Script
 * Removes duplicate events from the database, keeping only the first occurrence
 * 
 * Run with: node scripts/cleanupDuplicates.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Generate normalized title for comparison
 */
function normalizeTitle(title) {
    return (title || '').toLowerCase().trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .replace(/\b(the|a|an|in|on|at|for|to|of|and|or)\b/g, '')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Generate title hash
 */
function generateTitleHash(title) {
    const normalized = normalizeTitle(title);
    return crypto.createHash('md5').update(normalized).digest('hex');
}

async function cleanupDuplicates() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const Event = mongoose.connection.collection('events');

        // Get all events
        const allEvents = await Event.find({}).toArray();
        console.log(`Total events in database: ${allEvents.length}\n`);

        // Group events by normalized title
        const eventsByTitle = new Map();

        for (const event of allEvents) {
            const titleHash = generateTitleHash(event.title);

            if (!eventsByTitle.has(titleHash)) {
                eventsByTitle.set(titleHash, []);
            }
            eventsByTitle.get(titleHash).push(event);
        }

        // Find duplicates
        let duplicateGroups = 0;
        let totalDuplicates = 0;
        const idsToDelete = [];

        console.log('=== Duplicate Groups Found ===\n');

        for (const [titleHash, events] of eventsByTitle) {
            if (events.length > 1) {
                duplicateGroups++;

                // Sort by createdAt, keep the oldest
                events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                const keep = events[0];
                const duplicates = events.slice(1);

                console.log(`"${keep.title}"`);
                console.log(`  - Keeping: ${keep._id} (${keep.source}, created ${keep.createdAt})`);

                for (const dup of duplicates) {
                    console.log(`  - Deleting: ${dup._id} (${dup.source}, created ${dup.createdAt})`);
                    idsToDelete.push(dup._id);
                    totalDuplicates++;
                }
                console.log('');
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Duplicate groups: ${duplicateGroups}`);
        console.log(`Total duplicates to delete: ${totalDuplicates}`);
        console.log(`Events to keep: ${allEvents.length - totalDuplicates}\n`);

        if (totalDuplicates > 0) {
            console.log('Deleting duplicates...');

            const deleteResult = await Event.deleteMany({
                _id: { $in: idsToDelete }
            });

            console.log(`Deleted ${deleteResult.deletedCount} duplicate events.\n`);

            // Now update remaining events with titleHash
            console.log('Updating remaining events with titleHash...');

            const remainingEvents = await Event.find({}).toArray();
            let updated = 0;

            for (const event of remainingEvents) {
                const titleHash = generateTitleHash(event.title);
                await Event.updateOne(
                    { _id: event._id },
                    { $set: { titleHash: titleHash } }
                );
                updated++;
            }

            console.log(`Updated ${updated} events with titleHash.\n`);
        } else {
            console.log('No duplicates found. Database is clean!');
        }

        // Final count
        const finalCount = await Event.countDocuments();
        console.log(`Final event count: ${finalCount}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit(0);
    }
}

cleanupDuplicates();
