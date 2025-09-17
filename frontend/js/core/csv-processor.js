/**
 * CSVProcessor - Data-driven CSV parsing and validation module
 * Handles all CSV processing with configurable bureau detection
 */

import { configLoader } from './config-loader.js';

export class CSVProcessor {
    constructor(bureauConfig) {
        this.bureauConfig = bureauConfig;
        this.processedData = [];
    }

    /**
     * Process multiple CSV files
     * @param {FileList} files - CSV files to process
     * @returns {Promise<Array>} Processed violation data
     */
    async processFiles(files) {
        const promises = Array.from(files).map(file => this.processFile(file));
        const results = await Promise.all(promises);
        return results.flat();
    }

    /**
     * Process single CSV file
     * @param {File} file - CSV file to process
     * @returns {Promise<Array>} Parsed and validated data
     */
    processFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const validData = await this.validateAndEnrichData(results.data, file.name);
                    resolve(validData);
                },
                error: (error) => {
                    console.error(`Error parsing CSV ${file.name}:`, error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Validate and enrich CSV data with bureau information
     * @param {Array} data - Raw CSV data
     * @param {String} filename - Source filename for bureau detection
     * @returns {Array} Validated and enriched data
     */
    async validateAndEnrichData(data, filename) {
        const validRows = [];
        for (const row of data) {
            if (await this.isValidViolation(row)) {
                const enriched = await this.enrichViolation(row, filename);
                validRows.push(enriched);
            }
        }
        return validRows;
    }

    /**
     * Check if row contains valid violation data
     * @param {Object} row - CSV row data
     * @returns {Boolean} True if valid violation
     */
    async isValidViolation(row) {
        // Filter out invalid entries
        if (!row.violation_type) return false;
        const noViolationsMsg = await configLoader.getViolationMessage('noViolations');
        if (row.violation_type === noViolationsMsg) return false;
        if (row.violation_type.startsWith('COMBO_')) return false;

        // Check for required fields
        if (!row.pdf_filename) return false;

        return true;
    }

    /**
     * Enrich violation with additional metadata
     * @param {Object} row - Violation data
     * @param {String} sourceFile - Source CSV filename
     * @returns {Object} Enriched violation
     */
    async enrichViolation(row, sourceFile) {
        // Detect bureau from PDF filename or source
        const bureau = await this.detectBureau(row.pdf_filename || sourceFile);

        // Parse coordinates as numbers
        const violation = {
            ...row,
            bureau: bureau,
            x: parseFloat(row.x) || 0,
            y: parseFloat(row.y) || 0,
            width: parseFloat(row.width) || 0,
            height: parseFloat(row.height) || 0,
            page: parseInt(row.page) || 1,
            severity: (row.severity || await configLoader.getViolationMessage('unknownType')).toLowerCase(),
            hasCoordinates: !!(row.x && row.y && row.width && row.height)
        };

        return violation;
    }

    /**
     * Detect bureau from filename using configured patterns
     * @param {String} filename - Filename to check
     * @returns {String} Bureau acronym or 'UNKNOWN'
     */
    async detectBureau(filename) {
        const unknownBureau = (await configLoader.getBureaus()).find(b => b === 'UNKNOWN') || 'UNKNOWN';
        if (!filename) return unknownBureau;

        const upperFilename = filename.toUpperCase();

        for (const [bureauKey, bureauData] of Object.entries(this.bureauConfig.bureaus)) {
            for (const pattern of bureauData.patterns) {
                if (upperFilename.includes(pattern.toUpperCase())) {
                    return bureauKey;
                }
            }
        }

        return unknownBureau;
    }

    /**
     * Group violations by PDF filename
     * @param {Array} violations - All violations
     * @returns {Object} Violations grouped by PDF
     */
    groupByPDF(violations) {
        return violations.reduce((grouped, violation) => {
            const pdf = violation.pdf_filename;
            if (!grouped[pdf]) {
                grouped[pdf] = [];
            }
            grouped[pdf].push(violation);
            return grouped;
        }, {});
    }

    /**
     * Get violation statistics
     * @param {Array} violations - Violation data
     * @returns {Object} Statistics summary
     */
    async getStatistics(violations) {
        const stats = {
            total: violations.length,
            bySeverity: {},
            byBureau: {},
            byPDF: {},
            withCoordinates: 0,
            withoutCoordinates: 0
        };

        // Initialize counters
        const severities = await configLoader.getSeverities();
        severities.forEach(s => stats.bySeverity[s] = 0);

        Object.keys(this.bureauConfig.bureaus).forEach(b => stats.byBureau[b] = 0);
        const bureaus = await configLoader.getBureaus();
        const unknownBureau = bureaus.find(b => b === 'UNKNOWN') || 'UNKNOWN';
        stats.byBureau[unknownBureau] = 0;

        // Count violations
        for (const v of violations) {
            // Severity
            const defaultSeverity = await configLoader.getViolationMessage('unknownType');
            const severity = v.severity || defaultSeverity;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

            // Bureau
            const unknownBureau = (await configLoader.getBureaus()).find(b => b === 'UNKNOWN') || 'UNKNOWN';
            const bureau = v.bureau || unknownBureau;
            stats.byBureau[bureau] = (stats.byBureau[bureau] || 0) + 1;

            // PDF
            const pdf = v.pdf_filename;
            stats.byPDF[pdf] = (stats.byPDF[pdf] || 0) + 1;

            // Coordinates
            if (v.hasCoordinates) {
                stats.withCoordinates++;
            } else {
                stats.withoutCoordinates++;
            }
        }

        return stats;
    }

    /**
     * Export violations to CSV format
     * @param {Array} violations - Violations to export
     * @returns {String} CSV string
     */
    exportToCSV(violations) {
        return Papa.unparse(violations, {
            header: true,
            skipEmptyLines: true
        });
    }
}