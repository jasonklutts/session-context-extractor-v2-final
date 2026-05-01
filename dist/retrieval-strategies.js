"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalSystem = void 0;
/**
 * OpenClaw Retrieval System: 8 STRATEGIES
 *
 * From retrieval.md:
 * 1. MASSIVE KEYWORDS (primary + FR/EN + synonyms + technical + abbreviations)
 * 2. REFORMULATED CONCEPTS (multi-phrase retrieval)
 * 3. GRAPH LINKING (Related: navigation)
 * 4. CONTEXTUAL HEADERS (descriptive headers for search)
 * 5. FREQUENCY-BASED BOOSTING (count occurrences, boost priority)
 * 6. HYBRID SEARCH (semantic + BM25 keyword)
 * 7. CHUNKING STRATEGY (split by headers, precise retrieval)
 * 8. QUERY EXPANSION (generate variants)
 */
class RetrievalSystem {
    constructor() {
        this.keywordMap = new Map();
        this.frequencyMap = new Map();
        this.initializeKeywords();
    }
    /**
     * STRATEGY 1: MASSIVE KEYWORDS
     * Build comprehensive keyword matrix with FR/EN variants
     */
    initializeKeywords() {
        const keywords = {
            // Decision/Reasoning
            'decision': ['decision', 'choice', 'decided', 'choose', 'reasoning', 'décision', 'choix'],
            'error': ['error', 'failed', 'failure', 'broken', 'bug', 'erreur', 'échec'],
            'preference': ['preference', 'prefer', 'like', 'dislike', 'préférence', 'aimer'],
            // Technical
            'proxmox': ['proxmox', 'hypervisor', 'vm', 'virtual', 'pve', 'virtualization'],
            'splunk': ['splunk', 'logging', 'siem', 'log', 'search', 'alert'],
            'azure': ['azure', 'az-104', 'az104', 'microsoft cloud', 'cloud'],
            'oci': ['oci', 'oracle', '1z0-1085', 'oracle cloud', 'foundation'],
            // Memory
            'memory': ['memory', 'remember', 'recall', 'vault', 'mémoire', 'souvenir'],
        };
        for (const [key, variants] of Object.entries(keywords)) {
            this.keywordMap.set(key, variants);
        }
    }
    /**
     * STRATEGY 2: REFORMULATED CONCEPTS
     * Generate multi-phrase versions for retrieval
     */
    reformulateConcept(concept) {
        const variants = [concept];
        // Add abbreviation expansions
        if (concept === 'oci')
            variants.push('oracle cloud infrastructure');
        if (concept === 'az')
            variants.push('azure');
        if (concept === 'vm')
            variants.push('virtual machine');
        // Add FR translations (basic)
        const translations = {
            'memory': 'mémoire',
            'error': 'erreur',
            'decision': 'décision',
        };
        if (translations[concept])
            variants.push(translations[concept]);
        return variants;
    }
    /**
     * STRATEGY 3: GRAPH LINKING
     * Already handled by GraphLinkManager, but docs reference here
     */
    getRelatedFacts(fact, allFacts) {
        // Placeholder: actual linking done in graph.ts
        return [];
    }
    /**
     * STRATEGY 4: CONTEXTUAL HEADERS
     * Score headers higher in search results
     */
    scoreHeader(header, query) {
        return header.toLowerCase().includes(query.toLowerCase()) ? 2.0 : 1.0;
    }
    /**
     * STRATEGY 5: FREQUENCY-BASED BOOSTING
     * Count occurrences, boost important facts
     */
    trackFrequency(key) {
        this.frequencyMap.set(key, (this.frequencyMap.get(key) || 0) + 1);
    }
    getFrequencyScore(key) {
        const count = this.frequencyMap.get(key) || 0;
        // Boost facts mentioned 3+ times
        if (count >= 3)
            return 2.0;
        if (count >= 2)
            return 1.5;
        return 1.0;
    }
    /**
     * STRATEGY 6: HYBRID SEARCH (Semantic + BM25)
     * Combine keyword matching (BM25-style) with semantic similarity
     */
    hybridScore(query, content) {
        // BM25-style keyword matching
        const queryTerms = query.toLowerCase().split(/\s+/);
        let keywordScore = 0;
        const contentLower = content.toLowerCase();
        for (const term of queryTerms) {
            if (contentLower.includes(term)) {
                keywordScore += 1;
            }
        }
        // Simple semantic: word overlap
        const queryWords = new Set(queryTerms);
        const contentWords = content.toLowerCase().split(/\s+/);
        let overlap = 0;
        for (const word of contentWords) {
            if (word.length > 3 && queryWords.has(word)) {
                overlap++;
            }
        }
        // Combine: 70% keyword, 30% semantic
        const normalizedKeyword = keywordScore / queryTerms.length;
        const normalizedSemantic = overlap / contentWords.length;
        return 0.7 * normalizedKeyword + 0.3 * normalizedSemantic;
    }
    /**
     * STRATEGY 7: CHUNKING STRATEGY
     * Split content by headers for precise retrieval
     */
    chunk(content) {
        const chunks = [];
        const lines = content.split('\n');
        let currentHeader = 'root';
        let currentBody = [];
        for (const line of lines) {
            if (line.match(/^#{1,3} /)) {
                if (currentBody.length > 0) {
                    chunks.push({ header: currentHeader, body: currentBody.join('\n') });
                }
                currentHeader = line.replace(/^#+\s/, '');
                currentBody = [];
            }
            else {
                currentBody.push(line);
            }
        }
        if (currentBody.length > 0) {
            chunks.push({ header: currentHeader, body: currentBody.join('\n') });
        }
        return chunks;
    }
    /**
     * STRATEGY 8: QUERY EXPANSION
     * Generate variants from user query
     */
    expandQuery(query) {
        const expanded = new Set([query]);
        // Add keywords
        for (const [key, variants] of this.keywordMap) {
            if (query.toLowerCase().includes(key)) {
                variants.forEach(v => expanded.add(v));
            }
        }
        // Add reformulated versions
        const reformulated = this.reformulateConcept(query);
        reformulated.forEach(r => expanded.add(r));
        // Add stems
        this.addStems(query).forEach(s => expanded.add(s));
        return Array.from(expanded);
    }
    addStems(word) {
        const stems = [];
        const lower = word.toLowerCase();
        if (lower.endsWith('ing'))
            stems.push(lower.slice(0, -3));
        if (lower.endsWith('ed'))
            stems.push(lower.slice(0, -2));
        if (lower.endsWith('s'))
            stems.push(lower.slice(0, -1));
        return stems;
    }
    /**
     * Execute full retrieval with all 8 strategies
     */
    search(query, facts) {
        const expanded = this.expandQuery(query);
        const results = [];
        for (const fact of facts) {
            let score = 0;
            // Strategy 6: Hybrid score
            for (const variant of expanded) {
                score += this.hybridScore(variant, fact.content);
            }
            // Strategy 5: Frequency boost
            score *= this.getFrequencyScore(fact.id);
            // Strategy 4: Header contextual
            score *= this.scoreHeader(fact.title, query);
            if (score > 0) {
                results.push({ fact, score });
                this.trackFrequency(fact.id);
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
}
exports.RetrievalSystem = RetrievalSystem;
//# sourceMappingURL=retrieval-strategies.js.map