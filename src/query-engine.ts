import { VaultDatabase } from './db';
import { Fact, FactType, QueryResult, VaultQuery } from './types';
import lunr, { Index } from 'lunr';

export class QueryEngine {
  private db: VaultDatabase;
  private index: Index | null = null;

  constructor(db: VaultDatabase) {
    this.db = db;
  }

  /**
   * Search facts by natural language query
   */
  search(query: VaultQuery): QueryResult[] {
    const facts = this.db.searchFacts(
      query.text,
      query.type,
      query.system,
      query.verifiedOnly
    );

    return facts.map(fact => ({
      fact,
      score: this.scoreRelevance(fact, query),
      context: this.generateContext(fact),
    }));
  }

  /**
   * Get all facts of a specific type
   */
  getByType(type: FactType, limit: number = 50): Fact[] {
    return this.db.getFactsByType(type, limit);
  }

  /**
   * Get recent facts from the last N days
   */
  getRecent(days: number = 7): Fact[] {
    return this.db.getRecentFacts(days);
  }

  /**
   * Answer natural language questions about the vault
   */
  askQuestion(question: string): QueryResult[] {
    // Detect question type
    const lowerQuestion = question.toLowerCase();

    let query: VaultQuery = { text: question };

    if (lowerQuestion.includes('decision') || lowerQuestion.includes('decide')) {
      query.type = 'decision';
    } else if (lowerQuestion.includes('error') || lowerQuestion.includes('failed')) {
      query.type = 'error';
    } else if (lowerQuestion.includes('prefer') || lowerQuestion.includes('like')) {
      query.type = 'preference';
    } else if (lowerQuestion.includes('who') || lowerQuestion.includes('contact')) {
      query.type = 'contact';
    }

    return this.search(query);
  }

  private scoreRelevance(fact: Fact, query: VaultQuery): number {
    let score = 0;

    // Verification bonus
    if (query.verifiedOnly && fact.verified) {
      score += 10;
    }

    // Type match bonus
    if (query.type && fact.type === query.type) {
      score += 5;
    }

    // System match bonus
    if (query.system && fact.system === query.system) {
      score += 3;
    }

    // Recency bonus (newer is better)
    const daysOld = (Date.now() - new Date(fact.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysOld / 10);

    return score;
  }

  private generateContext(fact: Fact): string {
    const date = new Date(fact.timestamp).toLocaleDateString();
    const verified = fact.verified ? '[verified]' : '[unverified]';
    return `${date} ${verified} - ${fact.type}`;
  }

  /**
   * Get facts that need verification
   */
  getUnverified(): Fact[] {
    return this.db.searchFacts('', undefined, undefined, false)
      .filter(f => !f.verified);
  }

  /**
   * Get decisions that might be stale
   */
  getStaledecisions(daysThreshold: number = 90): Fact[] {
    const decisions = this.db.getFactsByType('decision', 1000);
    const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

    return decisions.filter(d => {
      const timestamp = new Date(d.timestamp).getTime();
      return timestamp < cutoff;
    });
  }

  /**
   * Get errors by affected system
   */
  getErrorsBySystem(system: string): Fact[] {
    return this.db.searchFacts('', 'error', system, false);
  }

  /**
   * Get decision history for a topic
   */
  getDecisionHistory(topic: string): Fact[] {
    const results = this.db.searchFacts(topic, 'decision', undefined, false);
    return results.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }
}
