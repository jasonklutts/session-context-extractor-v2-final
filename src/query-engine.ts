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

    if (this.isAggregateQuery(query.text)) {
      return this.aggregateResults(results, query);
    }

    return results.sort((a, b) => b.score - a.score);
  }

  getByType(type: FactType, limit: number = 50): Fact[] {
    return this.db.getFactsByType(type, limit);
  }

  getRecent(days: number = 7): Fact[] {
    return this.db.getRecentFacts(days);
  }

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

    // For aggregate queries, search all recent facts regardless of type
    if (this.isAggregateQuery(question)) {
      const allFacts = this.db.getRecentFacts(30);
      const results = allFacts.map(fact => ({
        fact,
        score: this.scoreRelevance(fact, query),
        context: this.generateContext(fact),
      }));
      return this.aggregateResults(results, query);
    }

    return this.search(query);
  }

  private isAggregateQuery(text: string): boolean {
    const triggers = [
      'total', 'how many', 'count', 'sum', 'all errors',
      'this week', 'today', 'last week', 'per day', 'breakdown',
      'miles', 'ran', 'run', 'calories', 'sleep', 'slept',
      'hours', 'water', 'glasses', 'spent', 'earned', 'made',
      'tasks', 'commits', 'pages', 'summary',
    ];
    const lower = text.toLowerCase();
    return triggers.some(t => lower.includes(t));
  }

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
      const summary = this.buildAggregationSummary(key, group, groupKey, query.text);

      aggregated.push({
        fact: {
          ...topFact,
          content: summary,
          title: `[${groupKey}: ${key}] ${group.length} fact(s)`,
        },
        score: totalScore,
        context: `${group.length} fact(s) grouped by ${groupKey} — ${this.generateContext(topFact)}`,
      });
    }

    return aggregated.sort((a, b) => b.score - a.score);
  }

  private detectGroupKey(text: string): 'date' | 'system' | 'type' {
    const lower = text.toLowerCase();
    if (lower.includes('system') || lower.includes('proxmox') || lower.includes('splunk')) return 'system';
    if (lower.includes('type') || lower.includes('error') || lower.includes('decision')) return 'type';
    return 'date';
  }

  private extractGroupValue(fact: Fact, key: 'date' | 'system' | 'type'): string {
    if (key === 'date') {
      return new Date(fact.timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    }
    if (key === 'system') return fact.system ?? 'unknown';
    return fact.type;
  }

  private buildAggregationSummary(
    key: string,
    group: QueryResult[],
    groupKey: string,
    queryText: string
  ): string {
    const lower = queryText.toLowerCase();
    const lines: string[] = [];
    const numericTotals: Record<string, number> = {};

    for (const r of group) {
      const content = r.fact.content;

      if (lower.includes('miles') || lower.includes('ran') || lower.includes('run')) {
        const match = content.match(/(\d+\.?\d*)\s*miles?/i);
        if (match) numericTotals['miles'] = (numericTotals['miles'] || 0) + parseFloat(match[1]);
      }
      if (lower.includes('calories')) {
        const match = content.match(/(\d+)\s*calories?/i);
        if (match) numericTotals['calories'] = (numericTotals['calories'] || 0) + parseInt(match[1]);
      }
      if (lower.includes('sleep') || lower.includes('slept') || lower.includes('hours')) {
        const match = content.match(/(\d+\.?\d*)\s*hours?\s*(of\s+sleep|sleep)?/i) ||
                      content.match(/slept\s+(\d+\.?\d*)\s*hours?/i);
        if (match) numericTotals['sleep_hours'] = (numericTotals['sleep_hours'] || 0) + parseFloat(match[1]);
      }
      if (lower.includes('water') || lower.includes('glasses')) {
        const match = content.match(/(\d+)\s*glasses?\s*(of\s+water|water)?/i);
        if (match) numericTotals['glasses_water'] = (numericTotals['glasses_water'] || 0) + parseInt(match[1]);
      }
      if (lower.includes('spent') || lower.includes('spend')) {
        const match = content.match(/\$(\d+\.?\d*)/);
        if (match) numericTotals['spent_$'] = (numericTotals['spent_$'] || 0) + parseFloat(match[1]);
      }
      if (lower.includes('earned') || lower.includes('made') || lower.includes('income')) {
        const matches = content.match(/earned\s+\$(\d+)|made\s+\$(\d+)/i);
        if (matches) {
          const val = parseFloat(matches[1] || matches[2]);
          numericTotals['earned_$'] = (numericTotals['earned_$'] || 0) + val;
        }
      }
      if (lower.includes('tasks')) {
        const match = content.match(/(\d+)\s*tasks?/i);
        if (match) numericTotals['tasks'] = (numericTotals['tasks'] || 0) + parseInt(match[1]);
      }
      if (lower.includes('commits')) {
        const match = content.match(/(\d+)\s*commits?/i);
        if (match) numericTotals['commits'] = (numericTotals['commits'] || 0) + parseInt(match[1]);
      }
      if (lower.includes('pages')) {
        const match = content.match(/(\d+)\s*pages?/i);
        if (match) numericTotals['pages'] = (numericTotals['pages'] || 0) + parseInt(match[1]);
      }

      lines.push(`- [${new Date(r.fact.timestamp).toLocaleDateString()}] ${content}`);
    }

    let summary = '';

    if (Object.keys(numericTotals).length > 0) {
      summary += `Totals for ${groupKey}="${key}":\n`;
      for (const [metric, total] of Object.entries(numericTotals)) {
        const label = metric.replace('_', ' ');
        summary += `  ${label}: ${Number.isInteger(total) ? total : total.toFixed(2)}\n`;
      }
      summary += '\nSource facts:\n';
    } else {
      summary += `${group.length} fact(s) for ${groupKey}="${key}":\n`;
    }

    summary += lines.join('\n');
    return summary;
  }

  private scoreRelevance(fact: Fact, query: VaultQuery): number {
    let score = 0;

    if (query.verifiedOnly && fact.verified) score += 10;
    if (query.type && fact.type === query.type) score += 5;
    if (query.system && fact.system === query.system) score += 3;

    const daysOld = (Date.now() - new Date(fact.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysOld / 10);

    return score;
  }

  private generateContext(fact: Fact): string {
    const date = new Date(fact.timestamp).toLocaleDateString();
    const verified = fact.verified ? '[verified]' : '[unverified]';
    return `${date} ${verified} - ${fact.type}`;
  }

  getUnverified(): Fact[] {
    return this.db.searchFacts('', undefined, undefined, false)
      .filter(f => !f.verified);
  }

  getStaleDecisions(daysThreshold: number = 90): Fact[] {
    const decisions = this.db.getFactsByType('decision', 1000);
    const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
    return decisions.filter(d => new Date(d.timestamp).getTime() < cutoff);
  }

  getErrorsBySystem(system: string): Fact[] {
    return this.db.searchFacts('', 'error', system, false);
  }

  getDecisionHistory(topic: string): Fact[] {
    const results = this.db.searchFacts(topic, 'decision', undefined, false);
    return results.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
