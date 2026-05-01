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
  timestamp: string; // ISO 8601
  sessionId: string;
  system?: string; // e.g., "Proxmox", "Azure", "OCI"
  verified: boolean;
  source: string; // where this came from in the session
}

export interface Decision extends Fact {
  type: 'decision';
  details: {
    choice: string; // what was chosen
    reasoning: string; // why
    rejected?: string[]; // what was rejected and why
    constraints?: string[]; // what mattered
    revisitTrigger?: string; // when to reconsider
    alternatives?: Record<string, string>; // option -> reason
  };
}

export interface ErrorEvent extends Fact {
  type: 'error';
  details: {
    errorMessages: string[]; // specific error output
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
    context: string; // what was discussed
    date?: string;
  };
}

export interface VaultEntry {
  id: string;
  type: FactType;
  markdown: string; // the actual markdown content to write
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface QueryResult {
  fact: Fact;
  score: number; // relevance score
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
