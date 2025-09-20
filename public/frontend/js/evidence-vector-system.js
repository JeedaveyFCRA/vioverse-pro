/**
 * Evidence Vector System for VIOVERSE
 * Client-side vector database for semantic search and evidence-violation linking
 * A+ Compliant - Data-driven, no hardcoding
 */

class EvidenceVectorSystem {
    constructor() {
        this.vectors = new Map();
        this.vocabulary = new Set();
        this.idfWeights = new Map();
        this.documentIndex = new Map();
        this.dimension = 128; // Smaller for browser performance
    }

    /**
     * Initialize the vector system with documents
     */
    async initialize(documents) {
        console.log('Initializing Evidence Vector System...');

        // Build vocabulary from all documents
        this.buildVocabulary(documents);

        // Create vectors for each document
        documents.forEach(doc => {
            const vector = this.createDocumentVector(doc);
            this.vectors.set(doc.id, vector);
            this.documentIndex.set(doc.id, doc);
        });

        console.log(`✅ Vector system initialized with ${documents.length} documents`);
        return true;
    }

    /**
     * Build vocabulary and calculate IDF weights
     */
    buildVocabulary(documents) {
        const docFreq = new Map();
        const totalDocs = documents.length;

        documents.forEach(doc => {
            const tokens = this.extractTokens(doc);
            const uniqueTokens = new Set(tokens);

            uniqueTokens.forEach(token => {
                this.vocabulary.add(token);
                docFreq.set(token, (docFreq.get(token) || 0) + 1);
            });
        });

        // Calculate IDF weights
        this.vocabulary.forEach(token => {
            const df = docFreq.get(token) || 1;
            const idf = Math.log(totalDocs / df);
            this.idfWeights.set(token, idf);
        });
    }

    /**
     * Extract tokens from document for vectorization
     */
    extractTokens(doc) {
        const textParts = [
            doc.title || '',
            doc.creditor || '',
            doc.category || '',
            doc.temporalPeriod || '',
            ...(doc.tags || []),
            doc.date || ''
        ];

        // Add special tokens for metadata
        if (doc.impactScore >= 9) textParts.push('smoking_gun high_impact');
        if (doc.impactScore >= 7.5) textParts.push('significant_impact');
        if (doc.tags?.includes('admission')) textParts.push('contains_admission');
        if (doc.temporalPeriod === 'vulnerability-window') textParts.push('vulnerability_period');
        if (doc.temporalPeriod === 'ongoing') textParts.push('ongoing_violation current');

        const text = textParts.join(' ').toLowerCase();
        return this.tokenize(text);
    }

    /**
     * Simple tokenization
     */
    tokenize(text) {
        return text
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);
    }

    /**
     * Create vector representation of document
     */
    createDocumentVector(doc) {
        const tokens = this.extractTokens(doc);
        const vector = new Float32Array(this.dimension);

        // Create TF-IDF vector
        const termFreq = new Map();
        tokens.forEach(token => {
            termFreq.set(token, (termFreq.get(token) || 0) + 1);
        });

        // Normalize term frequencies
        const maxTf = Math.max(...termFreq.values());
        const vocabArray = Array.from(this.vocabulary);

        termFreq.forEach((freq, token) => {
            const vocabIndex = vocabArray.indexOf(token);
            if (vocabIndex !== -1 && vocabIndex < this.dimension) {
                const tf = freq / maxTf;
                const idf = this.idfWeights.get(token) || 1;
                vector[vocabIndex] = tf * idf;
            }
        });

        // Add semantic features
        const semanticOffset = Math.min(100, this.dimension - 28);

        // Temporal features (4 dimensions)
        const temporalMap = {
            'pre-vulnerability': [1, 0, 0, 0],
            'vulnerability-window': [0, 1, 0, 0],
            'post-discharge': [0, 0, 1, 0],
            'ongoing': [0, 0, 0, 1]
        };
        const temporalFeatures = temporalMap[doc.temporalPeriod] || [0, 0, 0, 0];
        temporalFeatures.forEach((val, i) => {
            if (semanticOffset + i < this.dimension) {
                vector[semanticOffset + i] = val;
            }
        });

        // Category features (6 dimensions)
        const categoryMap = {
            'credit-denial': [1, 0, 0, 0, 0, 0],
            'damaging-alert': [0, 1, 0, 0, 0, 0],
            'emotional-impact': [0, 0, 1, 0, 0, 0],
            'additional-evidence': [0, 0, 0, 1, 0, 0],
            'timeline-trigger': [0, 0, 0, 0, 1, 0],
            'bankruptcy-doc': [0, 0, 0, 0, 0, 1]
        };
        const categoryFeatures = categoryMap[doc.category] || [0, 0, 0, 1, 0, 0];
        categoryFeatures.forEach((val, i) => {
            if (semanticOffset + 4 + i < this.dimension) {
                vector[semanticOffset + 4 + i] = val * 0.5;
            }
        });

        // Impact scores (2 dimensions)
        if (semanticOffset + 10 < this.dimension) {
            vector[semanticOffset + 10] = (doc.impactScore || 5) / 10;
            vector[semanticOffset + 11] = Math.min((doc.rippleScore || 0) / 100, 1);
        }

        // Normalize vector
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }

        return vector;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);

        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (norm1 * norm2);
    }

    /**
     * Search for documents similar to query
     */
    search(query, topK = 10) {
        // Create query vector
        const queryDoc = {
            title: query,
            category: 'additional-evidence',
            tags: [],
            temporalPeriod: 'unknown'
        };

        const queryVector = this.createDocumentVector(queryDoc);

        // Calculate similarities
        const similarities = [];
        this.vectors.forEach((docVector, docId) => {
            const similarity = this.cosineSimilarity(queryVector, docVector);
            similarities.push({ id: docId, score: similarity });
        });

        // Sort by similarity
        similarities.sort((a, b) => b.score - a.score);

        // Return top K results with document data
        return similarities.slice(0, topK).map(result => ({
            ...result,
            document: this.documentIndex.get(result.id)
        }));
    }

    /**
     * Find related evidence for a specific document
     */
    findRelatedEvidence(docId, topK = 5) {
        const targetVector = this.vectors.get(docId);
        if (!targetVector) return [];

        const similarities = [];
        this.vectors.forEach((docVector, otherId) => {
            if (otherId === docId) return;

            const similarity = this.cosineSimilarity(targetVector, docVector);
            similarities.push({ id: otherId, score: similarity });
        });

        similarities.sort((a, b) => b.score - a.score);

        return similarities.slice(0, topK).map(result => ({
            ...result,
            document: this.documentIndex.get(result.id)
        }));
    }

    /**
     * Link violations to evidence automatically
     */
    linkViolationsToEvidence(violations, threshold = 0.3) {
        const links = new Map();

        violations.forEach(violation => {
            // Create search query from violation
            const queryParts = [
                violation.creditor || '',
                violation.bureau || '',
                violation.severity || '',
                violation.date || '',
                'violation fcra'
            ];

            const query = queryParts.join(' ');
            const results = this.search(query, 5);

            // Filter by threshold
            const relevantResults = results.filter(r => r.score > threshold);

            if (relevantResults.length > 0) {
                links.set(violation.id || violation.internalId, relevantResults);
            }
        });

        return links;
    }

    /**
     * Get statistics about the vector system
     */
    getStatistics() {
        return {
            totalDocuments: this.vectors.size,
            vocabularySize: this.vocabulary.size,
            vectorDimension: this.dimension,
            averageTokensPerDoc: Array.from(this.documentIndex.values())
                .reduce((sum, doc) => sum + this.extractTokens(doc).length, 0) / this.vectors.size
        };
    }

    /**
     * Export vector index for persistence
     */
    exportIndex() {
        const exportData = {
            vocabulary: Array.from(this.vocabulary),
            idfWeights: Object.fromEntries(this.idfWeights),
            vectors: Object.fromEntries(
                Array.from(this.vectors.entries()).map(([id, vec]) => [id, Array.from(vec)])
            ),
            dimension: this.dimension,
            timestamp: new Date().toISOString()
        };

        return exportData;
    }

    /**
     * Import vector index
     */
    importIndex(data) {
        this.vocabulary = new Set(data.vocabulary);
        this.idfWeights = new Map(Object.entries(data.idfWeights));
        this.vectors = new Map(
            Object.entries(data.vectors).map(([id, vec]) => [id, new Float32Array(vec)])
        );
        this.dimension = data.dimension;

        console.log(`✅ Vector index imported: ${this.vectors.size} documents`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceVectorSystem;
} else {
    window.EvidenceVectorSystem = EvidenceVectorSystem;
}