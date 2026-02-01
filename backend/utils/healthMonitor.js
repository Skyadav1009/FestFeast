/**
 * Scraper Health Monitor
 * Tracks scraper health, failures, and provides alerting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scraperLogger as logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health data file path
const HEALTH_FILE = path.join(__dirname, '../data/scraper-health.json');

// Ensure data directory exists
const dataDir = path.dirname(HEALTH_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Default health data structure
 */
const getDefaultHealthData = () => ({
    lastUpdated: new Date().toISOString(),
    sources: {},
    alerts: []
});

/**
 * Load health data from file
 */
const loadHealthData = () => {
    try {
        if (fs.existsSync(HEALTH_FILE)) {
            const data = fs.readFileSync(HEALTH_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        logger.error('Failed to load health data:', error);
    }
    return getDefaultHealthData();
};

/**
 * Save health data to file
 */
const saveHealthData = (data) => {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(HEALTH_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        logger.error('Failed to save health data:', error);
    }
};

/**
 * Record a successful scrape for a source
 */
export const recordSuccess = (sourceName, eventsCount) => {
    const health = loadHealthData();

    if (!health.sources[sourceName]) {
        health.sources[sourceName] = {
            name: sourceName,
            status: 'healthy',
            lastSuccess: null,
            lastFailure: null,
            consecutiveFailures: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            averageEvents: 0,
            history: []
        };
    }

    const source = health.sources[sourceName];
    source.status = 'healthy';
    source.lastSuccess = new Date().toISOString();
    source.consecutiveFailures = 0;
    source.totalSuccesses++;

    // Update average events
    source.averageEvents = Math.round(
        (source.averageEvents * (source.totalSuccesses - 1) + eventsCount) / source.totalSuccesses
    );

    // Add to history (keep last 30 entries)
    source.history.unshift({
        timestamp: new Date().toISOString(),
        success: true,
        eventsCount
    });
    source.history = source.history.slice(0, 30);

    saveHealthData(health);
    logger.info(`[HealthMonitor] Recorded success for ${sourceName}: ${eventsCount} events`);
};

/**
 * Record a failed scrape for a source
 */
export const recordFailure = (sourceName, errorMessage) => {
    const health = loadHealthData();

    if (!health.sources[sourceName]) {
        health.sources[sourceName] = {
            name: sourceName,
            status: 'healthy',
            lastSuccess: null,
            lastFailure: null,
            consecutiveFailures: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            averageEvents: 0,
            history: []
        };
    }

    const source = health.sources[sourceName];
    source.lastFailure = new Date().toISOString();
    source.consecutiveFailures++;
    source.totalFailures++;

    // Update status based on consecutive failures
    if (source.consecutiveFailures >= 5) {
        source.status = 'critical';
    } else if (source.consecutiveFailures >= 3) {
        source.status = 'warning';
    } else {
        source.status = 'unhealthy';
    }

    // Add to history
    source.history.unshift({
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
    });
    source.history = source.history.slice(0, 30);

    // Create alert if needed
    if (source.consecutiveFailures >= 3) {
        addAlert(health, {
            type: source.consecutiveFailures >= 5 ? 'critical' : 'warning',
            source: sourceName,
            message: `${sourceName} has failed ${source.consecutiveFailures} consecutive times`,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }

    saveHealthData(health);
    logger.warn(`[HealthMonitor] Recorded failure for ${sourceName}: ${errorMessage}`);
};

/**
 * Add an alert to health data
 */
const addAlert = (health, alert) => {
    health.alerts.unshift(alert);
    // Keep only last 50 alerts
    health.alerts = health.alerts.slice(0, 50);
};

/**
 * Get overall health status
 */
export const getHealthStatus = () => {
    const health = loadHealthData();

    const sources = Object.values(health.sources);
    const totalSources = sources.length;
    const healthySources = sources.filter(s => s.status === 'healthy').length;
    const warningSources = sources.filter(s => s.status === 'warning').length;
    const criticalSources = sources.filter(s => s.status === 'critical').length;
    const unhealthySources = sources.filter(s => s.status === 'unhealthy').length;

    let overallStatus = 'healthy';
    if (criticalSources > 0) {
        overallStatus = 'critical';
    } else if (warningSources > 0 || unhealthySources > Math.floor(totalSources / 2)) {
        overallStatus = 'warning';
    } else if (unhealthySources > 0) {
        overallStatus = 'degraded';
    }

    return {
        status: overallStatus,
        lastUpdated: health.lastUpdated,
        summary: {
            total: totalSources,
            healthy: healthySources,
            warning: warningSources,
            critical: criticalSources,
            unhealthy: unhealthySources
        },
        sources: health.sources,
        recentAlerts: health.alerts.slice(0, 10)
    };
};

/**
 * Get detailed status for a specific source
 */
export const getSourceStatus = (sourceName) => {
    const health = loadHealthData();
    return health.sources[sourceName] || null;
};

/**
 * Clear old alerts (older than 7 days)
 */
export const clearOldAlerts = () => {
    const health = loadHealthData();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    health.alerts = health.alerts.filter(alert =>
        new Date(alert.timestamp) > sevenDaysAgo
    );

    saveHealthData(health);
};

/**
 * Reset a source's failure count (after manual fix)
 */
export const resetSource = (sourceName) => {
    const health = loadHealthData();

    if (health.sources[sourceName]) {
        health.sources[sourceName].consecutiveFailures = 0;
        health.sources[sourceName].status = 'healthy';
        saveHealthData(health);
        return true;
    }

    return false;
};

/**
 * Generate health report for logging/email
 */
export const generateHealthReport = () => {
    const status = getHealthStatus();

    let report = `\n=== Scraper Health Report ===\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Overall Status: ${status.status.toUpperCase()}\n\n`;

    report += `Summary:\n`;
    report += `  - Total Sources: ${status.summary.total}\n`;
    report += `  - Healthy: ${status.summary.healthy}\n`;
    report += `  - Warning: ${status.summary.warning}\n`;
    report += `  - Critical: ${status.summary.critical}\n`;
    report += `  - Unhealthy: ${status.summary.unhealthy}\n\n`;

    report += `Source Details:\n`;
    for (const [name, source] of Object.entries(status.sources)) {
        const statusEmoji = {
            healthy: '✅',
            warning: '⚠️',
            critical: '❌',
            unhealthy: '🔸'
        }[source.status] || '❓';

        report += `  ${statusEmoji} ${name}:\n`;
        report += `     Status: ${source.status}\n`;
        report += `     Success Rate: ${source.totalSuccesses}/${source.totalSuccesses + source.totalFailures}\n`;
        report += `     Avg Events: ${source.averageEvents}\n`;
        if (source.lastSuccess) {
            report += `     Last Success: ${source.lastSuccess}\n`;
        }
        if (source.lastFailure) {
            report += `     Last Failure: ${source.lastFailure}\n`;
        }
        report += `\n`;
    }

    if (status.recentAlerts.length > 0) {
        report += `Recent Alerts:\n`;
        for (const alert of status.recentAlerts) {
            report += `  [${alert.type.toUpperCase()}] ${alert.timestamp}: ${alert.message}\n`;
        }
    }

    return report;
};

export default {
    recordSuccess,
    recordFailure,
    getHealthStatus,
    getSourceStatus,
    clearOldAlerts,
    resetSource,
    generateHealthReport
};
