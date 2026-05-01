import { Fact } from './types';
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
export declare class RetrievalSystem {
    private keywordMap;
    private frequencyMap;
    constructor();
    /**
     * STRATEGY 1: MASSIVE KEYWORDS
     * Build comprehensive keyword matrix with FR/EN variants
     */
    private initializeKeywords;
    /**
     * STRATEGY 2: REFORMULATED CONCEPTS
     * Generate multi-phrase versions for retrieval
     */
    reformulateConcept(concept: string): string[];
    /**
     * STRATEGY 3: GRAPH LINKING
     * Already handled by GraphLinkManager, but docs reference here
     */
    getRelatedFacts(fact: Fact, allFacts: Fact[]): Fact[];
    /**
     * STRATEGY 4: CONTEXTUAL HEADERS
     * Score headers higher in search results
     */
    scoreHeader(header: string, query: string): number;
    /**
     * STRATEGY 5: FREQUENCY-BASED BOOSTING
     * Count occurrences, boost important facts
     */
    trackFrequency(key: string): void;
    getFrequencyScore(key: string): number;
    /**
     * STRATEGY 6: HYBRID SEARCH (Semantic + BM25)
     * Combine keyword matching (BM25-style) with semantic similarity
     */
    hybridScore(query: string, content: string): number;
    /**
     * STRATEGY 7: CHUNKING STRATEGY
     * Split content by headers for precise retrieval
     */
    chunk(content: string): Array<{
        header: string;
        body: string;
    }>;
    /**
     * STRATEGY 8: QUERY EXPANSION
     * Generate variants from user query
     */
    expandQuery(query: string): string[];
    private addStems;
    /**
     * Execute full retrieval with all 8 strategies
     */
    search(query: string, facts: Fact[]): Array<{
        fact: Fact;
        score: number;
    }>;
}
//# sourceMappingURL=retrieval-strategies.d.ts.map