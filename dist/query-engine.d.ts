import { VaultDatabase } from './db';
import { Fact, FactType, QueryResult, VaultQuery } from './types';
export declare class QueryEngine {
    private db;
    private index;
    constructor(db: VaultDatabase);
    /**
     * Search facts by natural language query
     */
    search(query: VaultQuery): QueryResult[];
    /**
     * Get all facts of a specific type
     */
    getByType(type: FactType, limit?: number): Fact[];
    /**
     * Get recent facts from the last N days
     */
    getRecent(days?: number): Fact[];
    /**
     * Answer natural language questions about the vault
     */
    askQuestion(question: string): QueryResult[];
    private scoreRelevance;
    private generateContext;
    /**
     * Get facts that need verification
     */
    getUnverified(): Fact[];
    /**
     * Get decisions that might be stale
     */
    getStaledecisions(daysThreshold?: number): Fact[];
    /**
     * Get errors by affected system
     */
    getErrorsBySystem(system: string): Fact[];
    /**
     * Get decision history for a topic
     */
    getDecisionHistory(topic: string): Fact[];
}
//# sourceMappingURL=query-engine.d.ts.map