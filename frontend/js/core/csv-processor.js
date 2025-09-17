/**
 * CSVProcessor - Data-driven CSV parsing and validation module
 * Handles all CSV processing with configurable bureau detection
 */

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
                complete: (results) => {
                    const validData = this.validateAndEnrichData(results.data, file.name);
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
    validateAndEnrichData(data, filename) {
        return data
            .filter(row => this.isValidViolation(row))
            .map(row => this.enrichViolation(row, filename));
    }

    /**
     * Check if row contains valid violation data
     * @param {Object} row - CSV row data
     * @returns {Boolean} True if valid violation
     */
    isValidViolation(row) {
        // Filter out invalid entries
        if (!row.violation_type) return false;
        if (row.violation_type === 'No Violations Found') return false;
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
    enrichViolation(row, sourceFile) {
        // Detect bureau from PDF filename or source
        const bureau = this.detectBureau(row.pdf_filename || sourceFile);

        // Parse coordinates as numbers
        const violation = {
            ...row,
            bureau: bureau,
            x: parseFloat(row.x) || 0,
            y: parseFloat(row.y) || 0,
            width: parseFloat(row.width) || 0,
            height: parseFloat(row.height) || 0,
            page: parseInt(row.page) || 1,
            severity: (row.severity || 'unknown').toLowerCase(),
            hasCoordinates: !!(row.x && row.y && row.width && row.height)
        };

        return violation;
    }

    /**
     * Detect bureau from filename using configured patterns
     * @param {String} filename - Filename to check
     * @returns {String} Bureau acronym or 'UNKNOWN'
     */
    detectBureau(filename) {
        if (!filename) return 'UNKNOWN';

        const upperFilename = filename.toUpperCase();

        for (const [bureauKey, bureauData] of Object.entries(this.bureauConfig.bureaus)) {
            for (const pattern of bureauData.patterns) {
                if (upperFilename.includes(pattern.toUpperCase())) {
                    return bureauKey;
                }
            }
        }

        return 'UNKNOWN';
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
    getStatistics(violations) {
        const stats = {
            total: violations.length,
            bySeverity: {},
            byBureau: {},
            byPDF: {},
            withCoordinates: 0,
            withoutCoordinates: 0
        };

        // Initialize counters
        const severities = ['extreme', 'severe', 'serious', 'minor', 'unknown'];
        severities.forEach(s => stats.bySeverity[s] = 0);

        Object.keys(this.bureauConfig.bureaus).forEach(b => stats.byBureau[b] = 0);
        stats.byBureau['UNKNOWN'] = 0;

        // Count violations
        violations.forEach(v => {
            // Severity
            const severity = v.severity || 'unknown';
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

            // Bureau
            const bureau = v.bureau || 'UNKNOWN';
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
        });

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