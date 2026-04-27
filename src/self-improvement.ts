import fs from 'fs';
import path from 'path';

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

export class SelfImprovementManager {
  private learningsDir: string;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.learningsDir = path.join(workspacePath, '.learnings');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.learningsDir)) {
      fs.mkdirSync(this.learningsDir, { recursive: true });
      this.createFiles();
    }
  }

  private createFiles(): void {
    const files = {
      'LEARNINGS.md': '# Learnings\n\nCorrections, insights, knowledge gaps.\n\n',
      'ERRORS.md': '# Errors\n\nCommand failures and integration errors.\n\n',
      'FEATURE_REQUESTS.md': '# Feature Requests\n\nRequested capabilities.\n\n',
    };

    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(this.learningsDir, name), content);
    }
  }

  /**
   * Log a learning (correction, insight, etc.)
   */
  logLearning(type: LearningEntry['type'], priority: LearningEntry['priority'], summary: string, details: string): string {
    const id = `LRN-${this.dateId()}-${this.randomId()}`;
    const timestamp = new Date().toISOString();

    const entry = `## [${id}] ${type}\n\n`;
    let content = entry;
    content += `**Logged**: ${timestamp}\n`;
    content += `**Priority**: ${priority}\n`;
    content += `**Status**: pending\n\n`;
    content += `### Summary\n${summary}\n\n`;
    content += `### Details\n${details}\n\n`;
    content += `### Metadata\n`;
    content += `- Recurrence Count: 1\n`;
    content += `- First Seen: ${timestamp}\n`;
    content += `- Last Seen: ${timestamp}\n`;

    fs.appendFileSync(path.join(this.learningsDir, 'LEARNINGS.md'), '\n' + content);
    return id;
  }

  /**
   * Log an error
   */
  logError(skill: string, errorMsg: string, details: string = ''): string {
    const id = `ERR-${this.dateId()}-${this.randomId()}`;
    const timestamp = new Date().toISOString();

    const entry = `## [${id}] ${skill}\n\n`;
    let content = entry;
    content += `**Logged**: ${timestamp}\n`;
    content += `**Priority**: high\n`;
    content += `**Status**: pending\n\n`;
    content += `### Summary\n${skill} failed\n\n`;
    content += `### Error\n\`\`\`\n${errorMsg}\n\`\`\`\n\n`;
    content += `### Context\n${details}\n\n`;
    content += `### Metadata\n`;
    content += `- Reproducible: unknown\n`;

    fs.appendFileSync(path.join(this.learningsDir, 'ERRORS.md'), '\n' + content);
    return id;
  }

  /**
   * Detect recurring patterns (>3 occurrences = systemic)
   */
  detectPatterns(): Array<{type: string; count: number; entries: string[]}> {
    const patterns: Map<string, string[]> = new Map();

    // Read learnings
    const learningsPath = path.join(this.learningsDir, 'LEARNINGS.md');
    if (fs.existsSync(learningsPath)) {
      const content = fs.readFileSync(learningsPath, 'utf-8');
      const entries = content.match(/## \[LRN-[^\]]+\] (\w+)/g) || [];
      
      for (const entry of entries) {
        const type = entry.split('] ')[1];
        if (!patterns.has(type)) patterns.set(type, []);
        patterns.get(type)!.push(entry);
      }
    }

    // Return patterns with >3 occurrences
    return Array.from(patterns.entries())
      .filter(([_, entries]) => entries.length >= 3)
      .map(([type, entries]) => ({
        type,
        count: entries.length,
        entries,
      }));
  }

  /**
   * Promote entry to MEMORY.md when it's important
   */
  promoteToMemory(entryId: string, destination: string, content: string): void {
    const memoryPath = path.join(this.workspacePath, 'MEMORY.md');

    const promotion = `\n## Promoted from ${entryId}\n\n${content}\n`;

    if (fs.existsSync(memoryPath)) {
      fs.appendFileSync(memoryPath, promotion);
    }

    // Mark as promoted in learnings
    this.markPromoted(entryId);
  }

  private markPromoted(entryId: string): void {
    let content = fs.readFileSync(path.join(this.learningsDir, 'LEARNINGS.md'), 'utf-8');
    content = content.replace(
      new RegExp(`(## \\[${entryId}\\][\\s\\S]*?)status: pending`, 'gi'),
      `$1status: promoted`
    );
    fs.writeFileSync(path.join(this.learningsDir, 'LEARNINGS.md'), content);
  }

  /**
   * Generate self-review report (from self-improvement.md scorecard)
   */
  generateSelfReview(): string {
    const patterns = this.detectPatterns();
    const learnings = this.readEntries('LEARNINGS.md');
    const errors = this.readEntries('ERRORS.md');

    let report = '# Self-Review — System Health\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## 📊 Scorecard\n\n';
    report += `| Component | Status | Count |\n`;
    report += `|-----------|--------|-------|\n`;
    report += `| Pending Learnings | 🔄 | ${learnings.length} |\n`;
    report += `| Pending Errors | 🔴 | ${errors.length} |\n`;
    report += `| Detected Patterns | ⚠️ | ${patterns.length} |\n\n`;

    if (patterns.length > 0) {
      report += '## 🔄 Recurring Patterns\n\n';
      for (const p of patterns) {
        report += `- **${p.type}**: ${p.count} occurrences\n`;
      }
      report += '\n';
    }

    report += '## 📝 Recent Errors\n\n';
    for (const err of errors.slice(0, 5)) {
      report += `- ${err}\n`;
    }

    return report;
  }

  private readEntries(filename: string): string[] {
    const filepath = path.join(this.learningsDir, filename);
    if (!fs.existsSync(filepath)) return [];

    const content = fs.readFileSync(filepath, 'utf-8');
    return content.match(/## \[[^\]]+\]/g) || [];
  }

  private dateId(): string {
    return new Date().toISOString().split('T')[0].replace(/-/g, '');
  }

  private randomId(): string {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
  }
}
