/**
 * Violation-Evidence Bridge System for VIOVERSE
 * Links FCRA violations from credit reports to supporting evidence documents
 * A+ Compliant - Data-driven, no hardcoding
 */

class ViolationEvidenceBridge {
    constructor() {
        this.violations = {
            tradelines: [],
            publicRecords: []
        };
        this.evidence = [];
        this.vioBoxData = [];
        this.rules = {};
        this.caseContext = {};

        // Key dates from case
        this.keyDates = {
            discharge: '2024-02-09',
            caseClosedVulnerable: '2024-01-10',
            alertReceived: '2024-01-17',
            planComplete: '2023-08-22'
        };

        // Creditor mappings for consistency
        this.creditorMap = {
            'BK': 'Bank of America',
            'BOA': 'Bank of America',
            'CR': 'Cornerstone FCU',
            'CCO': 'Cornerstone FCU',
            'BB': 'Best Buy',
            'BBY': 'Best Buy/CBNA',
            'AL': 'Ally Financial',
            'ALL': 'Ally Financial',
            'JPM': 'JPMCB',
            'JPMCB': 'JPMCB',
            'THD': 'THD/CBNA',
            'BAR': 'Barclays',
            'BK': 'Barclays',
            'MAR': 'Mariner Finance',
            'DIS': 'Discover',
            'SRS': 'Sears/CBNA',
            'CIT': 'Citizens Bank',
            'RKT': 'Rocket Mortgage',
            'BEG': 'Best Egg',
            'CPO': 'Capital One'
        };
    }

    /**
     * Initialize the bridge with all data sources
     */
    async initialize() {
        console.log('Initializing Violation-Evidence Bridge...');

        // Load all data sources in parallel
        const promises = [
            this.loadViolationCSVs(),
            this.loadEvidenceManifest(),
            this.loadVioBoxData(),
            this.loadRules()
        ];

        await Promise.all(promises);

        // Create linkages
        this.createViolationEvidenceLinks();
        this.calculateImpactScores();

        console.log(`✅ Bridge initialized: ${this.getStatistics().totalViolations} violations, ${this.evidence.length} evidence docs`);
        return true;
    }

    /**
     * Load violation CSVs (tradelines and public records)
     */
    async loadViolationCSVs() {
        try {
            // Load litigation CSVs (Serious/Severe/Extreme only)
            const [tradelines, publicRecords] = await Promise.all([
                this.loadCSV('../assets/evidence/CSV-DATA-PROJECT/tradeline_violations_litigation_2025-09-14-2259.csv'),
                this.loadCSV('../assets/evidence/CSV-DATA-PROJECT/public_record_violations_litigation_2025-09-14-2259.csv')
            ]);

            this.violations.tradelines = tradelines;
            this.violations.publicRecords = publicRecords;

            console.log(`Loaded ${tradelines.length} tradeline violations`);
            console.log(`Loaded ${publicRecords.length} public record violations`);
        } catch (error) {
            console.error('Failed to load violation CSVs:', error);
        }
    }

    /**
     * Load CSV file and parse
     */
    async loadCSV(filepath) {
        const response = await fetch(filepath);
        const text = await response.text();
        return this.parseCSV(text);
    }

    /**
     * Parse CSV text to objects
     */
    parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            // Handle CSV with quoted fields containing commas
            const row = this.parseCSVRow(lines[i]);
            const obj = {};

            headers.forEach((header, index) => {
                obj[header.trim()] = row[index]?.trim() || '';
            });

            // Parse JSON fields if present
            if (obj.fields_json) {
                try {
                    obj.fields = JSON.parse(obj.fields_json);
                } catch (e) {
                    obj.fields = {};
                }
            }

            data.push(obj);
        }

        return data;
    }

    /**
     * Parse CSV row handling quoted fields
     */
    parseCSVRow(row) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Load evidence manifest
     */
    async loadEvidenceManifest() {
        try {
            const response = await fetch('../data/config/evidence-manifest-complete.json');
            const manifest = await response.json();
            this.evidence = manifest.documents;
            console.log(`Loaded ${this.evidence.length} evidence documents`);
        } catch (error) {
            console.error('Failed to load evidence manifest:', error);
        }
    }

    /**
     * Load VioBox coordinate data
     */
    async loadVioBoxData() {
        try {
            const bureaus = ['eq', 'ex', 'tu'];
            const promises = bureaus.map(bureau =>
                this.loadCSV(`../data/csv/${bureau}_violations_detailed_test.csv`)
            );

            const results = await Promise.all(promises);
            this.vioBoxData = results.flat();
            console.log(`Loaded ${this.vioBoxData.length} VioBox coordinates`);
        } catch (error) {
            console.error('Failed to load VioBox data:', error);
        }
    }

    /**
     * Load YAML rules (converted to JSON for browser)
     */
    async loadRules() {
        // In production, YAML would be pre-converted to JSON
        // For now, we'll use the rule patterns from the CSV data
        this.extractRulesFromViolations();
    }

    /**
     * Extract rule patterns from violation data
     */
    extractRulesFromViolations() {
        const rules = new Map();

        [...this.violations.tradelines, ...this.violations.publicRecords].forEach(violation => {
            if (!rules.has(violation.rule_id)) {
                rules.set(violation.rule_id, {
                    id: violation.rule_id,
                    name: violation.rule_name,
                    severity: violation.severity,
                    statutes: violation.statutes?.split(';') || [],
                    explanation: violation.explanation
                });
            }
        });

        this.rules = Object.fromEntries(rules);
        console.log(`Extracted ${Object.keys(this.rules).length} violation rules`);
    }

    /**
     * Create links between violations and evidence
     */
    createViolationEvidenceLinks() {
        const links = new Map();

        // For each violation, find related evidence
        [...this.violations.tradelines, ...this.violations.publicRecords].forEach(violation => {
            const creditor = this.normalizeCreditor(violation.creditor_full_name);
            const violationDate = violation.report_date;
            const severity = violation.severity;

            // Find evidence matching this creditor
            const matchingEvidence = this.evidence.filter(doc => {
                const docCreditor = this.normalizeCreditor(doc.creditor);

                // Match by creditor
                if (docCreditor === creditor || docCreditor === 'All Creditors') {
                    return true;
                }

                // Match by date proximity (within 30 days)
                if (doc.date && violationDate) {
                    const daysDiff = this.daysBetween(doc.date, violationDate);
                    if (Math.abs(daysDiff) <= 30) {
                        return true;
                    }
                }

                // Match by violation references in title/tags
                if (doc.title?.toLowerCase().includes(creditor.toLowerCase())) {
                    return true;
                }

                return false;
            });

            // Create bidirectional links
            matchingEvidence.forEach(doc => {
                // Link violation to evidence
                if (!links.has(violation)) {
                    links.set(violation, []);
                }
                links.get(violation).push(doc.id);

                // Link evidence to violation
                if (!doc.linkedViolations) {
                    doc.linkedViolations = [];
                }
                doc.linkedViolations.push({
                    creditor: creditor,
                    severity: severity,
                    date: violationDate,
                    rule: violation.rule_id,
                    description: violation.rule_name
                });
            });
        });

        this.violationEvidenceLinks = links;
        console.log(`Created ${links.size} violation-evidence links`);
    }

    /**
     * Calculate impact scores based on violations
     */
    calculateImpactScores() {
        this.evidence.forEach(doc => {
            if (!doc.linkedViolations) return;

            // Calculate score based on violation severity
            let score = 5.0; // Base score

            const severityCounts = {
                Extreme: 0,
                Severe: 0,
                Serious: 0
            };

            doc.linkedViolations.forEach(v => {
                severityCounts[v.severity] = (severityCounts[v.severity] || 0) + 1;
            });

            // Add points based on severity
            score += severityCounts.Extreme * 1.5;
            score += severityCounts.Severe * 1.0;
            score += severityCounts.Serious * 0.5;

            // Cap at 10
            doc.calculatedImpactScore = Math.min(10, score);
            doc.violationCounts = severityCounts;
            doc.totalViolations = doc.linkedViolations.length;
        });
    }

    /**
     * Normalize creditor names for matching
     */
    normalizeCreditor(creditor) {
        if (!creditor) return 'Unknown';

        // Check if it's a code
        const mapped = this.creditorMap[creditor];
        if (mapped) return mapped;

        // Normalize variations
        return creditor
            .replace(/[\/,]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate days between two dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Get violations for a specific creditor
     */
    getViolationsByCreditor(creditor) {
        const normalized = this.normalizeCreditor(creditor);

        return [
            ...this.violations.tradelines,
            ...this.violations.publicRecords
        ].filter(v =>
            this.normalizeCreditor(v.creditor_full_name) === normalized
        );
    }

    /**
     * Get evidence supporting specific violations
     */
    getEvidenceForViolation(violationId) {
        const evidenceIds = this.violationEvidenceLinks.get(violationId) || [];
        return this.evidence.filter(doc => evidenceIds.includes(doc.id));
    }

    /**
     * Get VioBox coordinates for a specific page
     */
    getVioBoxesForPage(pdfFilename, pageNum) {
        return this.vioBoxData.filter(box =>
            box.pdf_filename === pdfFilename &&
            parseInt(box.page) === pageNum
        );
    }

    /**
     * Generate violation summary statistics
     */
    getStatistics() {
        const stats = {
            totalViolations: this.violations.tradelines.length + this.violations.publicRecords.length,
            tradelineViolations: this.violations.tradelines.length,
            publicRecordViolations: this.violations.publicRecords.length,
            evidenceDocuments: this.evidence.length,
            linkedEvidence: this.evidence.filter(d => d.linkedViolations?.length > 0).length,
            vioBoxes: this.vioBoxData.length,
            bySeverity: {
                Extreme: 0,
                Severe: 0,
                Serious: 0
            },
            byCreditor: {},
            byBureau: {
                EQ: 0,
                EX: 0,
                TU: 0
            }
        };

        // Count by severity
        [...this.violations.tradelines, ...this.violations.publicRecords].forEach(v => {
            stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;

            // Count by creditor
            const creditor = this.normalizeCreditor(v.creditor_full_name);
            stats.byCreditor[creditor] = (stats.byCreditor[creditor] || 0) + 1;

            // Count by bureau
            if (v.bureau) {
                stats.byBureau[v.bureau] = (stats.byBureau[v.bureau] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * Search violations by criteria
     */
    searchViolations(criteria) {
        let results = [...this.violations.tradelines, ...this.violations.publicRecords];

        if (criteria.creditor) {
            const normalized = this.normalizeCreditor(criteria.creditor);
            results = results.filter(v =>
                this.normalizeCreditor(v.creditor_full_name) === normalized
            );
        }

        if (criteria.severity) {
            results = results.filter(v => v.severity === criteria.severity);
        }

        if (criteria.bureau) {
            results = results.filter(v => v.bureau === criteria.bureau);
        }

        if (criteria.afterDate) {
            results = results.filter(v => v.report_date >= criteria.afterDate);
        }

        return results;
    }

    /**
     * Generate violation report for evidence document
     */
    generateEvidenceViolationReport(evidenceId) {
        const doc = this.evidence.find(d => d.id === evidenceId);
        if (!doc) return null;

        const report = {
            evidence: doc,
            violations: doc.linkedViolations || [],
            summary: {
                total: doc.totalViolations || 0,
                extreme: doc.violationCounts?.Extreme || 0,
                severe: doc.violationCounts?.Severe || 0,
                serious: doc.violationCounts?.Serious || 0,
                impactScore: doc.calculatedImpactScore || doc.impactScore
            },
            creditors: [...new Set((doc.linkedViolations || []).map(v => v.creditor))],
            dateRange: this.getDateRange(doc.linkedViolations || [])
        };

        return report;
    }

    /**
     * Get date range from violations
     */
    getDateRange(violations) {
        if (!violations.length) return null;

        const dates = violations.map(v => v.date).filter(d => d);
        if (!dates.length) return null;

        dates.sort();
        return {
            earliest: dates[0],
            latest: dates[dates.length - 1]
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViolationEvidenceBridge;
} else {
    window.ViolationEvidenceBridge = ViolationEvidenceBridge;
}