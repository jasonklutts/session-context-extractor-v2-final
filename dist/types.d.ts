/**
 * Core types for Session Context Extractor
 */
export type FactType = 'decision' | 'error' | 'preference' | 'contact' | 'information';
export type VerificationStatus = 'verified' | 'unverified' | 'confirmed';
export interface Fact {
    id: string;
    type: FactType;
    title: string;
    content: string;
    details: Record<string, unknown>;
    timestamp: string;
    sessionId: string;
    system?: string;
    verified: boolean;
    source: string;
}
export interface Decision extends Fact {
    type: 'decision';
    details: {
        choice: string;
        reasoning: string;
        rejected?: string[];
        constraints?: string[];
        revisitTrigger?: string;
        alternatives?: Record<string, string>;
    };
}
export interface ErrorEvent extends Fact {
    type: 'error';
    details: {
        errorMessages: string[];
        affectedComponent: string;
        attempts: Array<{
            description: string;
            outcome: 'success' | 'failure' | 'partial';
            details?: string;
        }>;
        resolution?: string;
        lessons?: string[];
    };
}
export interface Preference extends Fact {
    type: 'preference';
    details: {
        topic: string;
        preference: string;
        context?: string;
        strength: 'casual' | 'moderate' | 'strong';
    };
}
export interface Contact extends Fact {
    type: 'contact';
    details: {
        name: string;
        relationship?: string;
        context: string;
        date?: string;
    };
}
export interface VaultEntry {
    id: string;
    type: FactType;
    markdown: string;
    metadata: Record<string, unknown>;
    timestamp: string;
}
export interface QueryResult {
    fact: Fact;
    score: number;
    context?: string;
}
export interface VaultQuery {
    text: string;
    type?: FactType;
    system?: string;
    verifiedOnly?: boolean;
    dateRange?: {
        start: string;
        end: string;
    };
}
//# sourceMappingURL=types.d.ts.map