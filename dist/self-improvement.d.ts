/**
 * OpenClaw Self-Improvement: Feedback Loop
 *
 * From self-improvement.md:
 * INNER LOOP (daily): Track errors, learnings, feature requests
 * OUTER LOOP (weekly): Detect patterns (>3 occurrences = systemic)
 * PROMOTION: Move important learnings to MEMORY.md or atomic files
 */
export interface LearningEntry {
    id: string;
    timestamp: string;
    type: 'correction' | 'insight' | 'knowledge_gap' | 'best_practice' | 'retrieval_failure';
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'resolved' | 'promoted';
    summary: string;
    details: string;
    recurrenceCount: number;
    firstSeen: string;
    lastSeen: string;
}
export interface ErrorEntry {
    id: string;
    timestamp: string;
    skill: string;
    priority: 'high' | 'critical';
    status: 'pending' | 'resolved';
    summary: string;
    errorMessage: string;
    reproducible: 'yes' | 'no' | 'unknown';
}
export declare class SelfImprovementManager {
    private learningsDir;
    private workspacePath;
    constructor(workspacePath: string);
    private ensureDir;
    private createFiles;
    /**
     * Log a learning (correction, insight, etc.)
     */
    logLearning(type: LearningEntry['type'], priority: LearningEntry['priority'], summary: string, details: string): string;
    /**
     * Log an error
     */
    logError(skill: string, errorMsg: string, details?: string): string;
    /**
     * Detect recurring patterns (>3 occurrences = systemic)
     */
    detectPatterns(): Array<{
        type: string;
        count: number;
        entries: string[];
    }>;
    /**
     * Promote entry to MEMORY.md when it's important
     */
    promoteToMemory(entryId: string, destination: string, content: string): void;
    private markPromoted;
    /**
     * Generate self-review report (from self-improvement.md scorecard)
     */
    generateSelfReview(): string;
    private readEntries;
    private dateId;
    private randomId;
}
//# sourceMappingURL=self-improvement.d.ts.map