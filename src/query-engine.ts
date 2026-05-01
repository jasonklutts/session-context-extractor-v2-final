import { VaultDatabase } from './db';
import { Fact, FactType, QueryResult, VaultQuery } from './types';
import lunr, { Index } from 'lunr';
import { RetrievalSystem } from './retrieval-strategies';

export class QueryEngine {
  private db: VaultDatabase;
  private index: Index | null = null;
  private retrieval = new RetrievalSystem();

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

    const results = facts.map(fact => ({
      fact,
      score: this.scoreRelevance(fact, query),
      context: this.generateContext(fact),
    }));

    // Post-processing: aggregate if query asks for totals/groupings
    if (this.isAggregateQuery(query.text)) {
      return this.aggregateResults(results, query);
    }

    return results.sort((a, b) => b.score - a.score);
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

  /**
   * Detect if query is asking for aggregated/totaled results
   */
  private isAggregateQuery(text: string): boolean {
    const triggers = [
      'total', 'how many', 'count', 'sum', 'all errors',
      'this week', 'today', 'last week', 'per day', 'breakdown',
    ];
    const lower = text.toLowerCase();
    return triggers.some(t => lower.includes(t));
  }

  /**
   * Group and collapse results by a shared key instead of returning individual rows
   */
  private aggregateResults(results: QueryResult[], query: VaultQuery): QueryResult[] {
    const groupKey = this.detectGroupKey(query.text);
    const groups = new Map<string, QueryResult[]>();

    for (const result of results) {
      const key = this.extractGroupValue(result.fact, groupKey);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(result);
    }

    const aggregated: QueryResult[] = [];

    for (const [key, group] of groups) {
      const topFact = group.reduce((a, b) => a.score > b.score ? a : b).fact;
      const totalScore = group.reduce((sum, r) => sum + r.score, 0);
      const summary = this.buildAggregationSummary(key, group, groupKey);

      aggregated.push({
        fact: {
          ...topFact,
          content: summary,
          title: `[Aggregated by ${groupKey}] ${key}`,
        },
        score: totalScore,
        context: `${group.length} fact(s) grouped — ${this.generateContext(topFact)}`,
      });
    }

    return aggregated.sort((a, b) => b.score - a.score);
  }

  /**
   * Determine the best grouping dimension from the query text
   */
  private detectGroupKey(text: string): 'date' | 'system' | 'type' {
    const lower = text.toLowerCase();
    if (lower.includes('system') || lower.includes('proxmox') || lower.includes('splunk')) return 'system';
    if (lower.includes('type') || lower.includes('error') || lower.includes('decision')) return 'type';
    return 'date';
  }

  /**
   * Extract the grouping value from a fact based on the chosen key
   */
  private extractGroupValue(fact: Fact, key: 'date' | 'system' | 'type'): string {
    if (key === 'date') {
      return new Date(fact.timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    }
    if (key === 'system') return fact.system ?? 'unknown';
    return fact.type;
  }

  /**
   * Build a human-readable summary for a collapsed group
   */
  private buildAggregationSummary(
    key: string,
    group: QueryResult[],
    groupKey: string
  ): string {
    const lines = group.map(r => `- ${r.fact.title}: ${r.fact.content}`);
    return `${group.length} fact(s) for ${groupKey}="${key}":\n${lines.join('\n')}`;
  }

  private scoreRelevance(fact: Fact, query: VaultQuery): number {
    let score = 0;

    if (query.verifiedOnly && fact.verified) {
      score += 10;
    }

    if (query.type && fact.type === query.type) {
      score += 5;
    }

    if (query.system && fact.system === query.system) {
      score += 3;
    }

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
  getStaleDecisions(daysThreshold: number = 90): Fact[] {
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
