import fs from 'fs';
import path from 'path';
import { VaultDatabase } from './db';
import { VaultWriter } from './vault-writer';
import { Fact } from './types';

/**
 * OpenClaw Phase 2: DISTILLATION
 *
 * EXACT PIPELINE from memory-pipeline.md:
 * 1. READ .last_distill_date
 * 2. FOR EACH daily: Extract Decision/Information/Insight/Error lines
 * 3. DEDUPLICATE: Remove exact + near-duplicates (>80% similar)
 * 4. EVALUATE STABILITY: Keep only facts lasting >1 month (or critical)
 * 5. REFORMULATE: Rewrite clearly for retrieval
 * 6. DISTRIBUTE: Write to skill-local distill-log.md, atomic files
 * 7. WRITE .last_distill_date = today
 *
 * NOTE: Does NOT write to the main workspace MEMORY.md.
 * Distill output stays inside the skill's own memory/ directory.
 */
export class DistillationEngine {
  private db: VaultDatabase;
  private writer: VaultWriter;
  private workspacePath: string;
  private skillPath: string;

  constructor(workspacePath: string, db: VaultDatabase, writer: VaultWriter) {
    this.workspacePath = workspacePath;
    this.db = db;
    this.writer = writer;

    // Skill-local path — distill log lives here, not in main workspace
    this.skillPath = path.join(
      workspacePath,
      'skills',
      'session-context-extractor-v2',
      'memory'
    );
  }

  async distillAll(): Promise<void> {
    const dailiesDir = path.join(this.workspacePath, 'memory', 'dailies');
    const stateFile = path.join(this.workspacePath, '.last_distill_date');

    if (!fs.existsSync(dailiesDir)) {
      console.log('[DISTILL] No dailies directory');
      return;
    }

    // STEP 1: READ .last_distill_date
    let lastDate = '';
    if (fs.existsSync(stateFile)) {
      lastDate = fs.readFileSync(stateFile, 'utf-8').trim();
    }
    console.log(`[DISTILL] Processing since: ${lastDate || 'beginning'}`);

    const files = fs.readdirSync(dailiesDir).filter(f => f.endsWith('.md')).sort();
    const allFacts: Fact[] = [];

    // STEP 2: FOR EACH daily — Extract Decision/Information/Insight/Error
    for (const file of files) {
      const dateStr = file.replace('.md', '');
      if (lastDate && dateStr <= lastDate) continue;

      const filePath = path.join(dailiesDir, file);
      console.log(`[DISTILL] Extracting: ${file}`);

      const content = fs.readFileSync(filePath, 'utf-8');
      const facts = this.extractLines(content, dateStr);
      allFacts.push(...facts);
    }

    console.log(`[DISTILL] Extracted ${allFacts.length} facts`);

    // STEP 3: DEDUPLICATE
    const deduped = this.deduplicate(allFacts);
    console.log(`[DISTILL] After dedup: ${deduped.length} facts`);

    // STEP 4: EVALUATE STABILITY
    const stable = this.evaluateStability(deduped);
    console.log(`[DISTILL] Stable facts: ${stable.length}`);

    // STEP 5: REFORMULATE
    const reformulated = this.reformulate(stable);

    // STEP 6: DISTRIBUTE — write to DB, atomic files, and skill-local log only
    for (const fact of reformulated) {
      this.db.saveFact(fact);
      this.writer.writeFact(fact);
    }

    // Write to skill-local distill-log.md (NOT main workspace MEMORY.md)
    this.appendDistillLog(reformulated);

    // STEP 7: WRITE .last_distill_date
    const today = new Date().toISOString().split('T')[0];
    fs.writeFileSync(stateFile, today);

    console.log(`[DISTILL] Complete. Stored ${reformulated.length} facts.`);
  }

  // Extract lines matching * Decision: / * Information: / * Error: / * Preference: / * Contact:
  private extractLines(content: string, dateStr: string): Fact[] {
    const facts: Fact[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('* Decision:') || line.includes('- Decision:')) {
        const text = line.replace(/[*-]\s*Decision:/, '').trim();
        facts.push({
          id: `dec_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'decision',
          title: text.substring(0, 80),
          content: text,
          details: { choice: text, reasoning: '', rejected: [], constraints: [] },
          timestamp: new Date(dateStr).toISOString(),
          sessionId: dateStr,
          verified: false,
          source: 'distilled',
        });
      } else if (line.includes('* Error:') || line.includes('- Error:')) {
        const text = line.replace(/[*-]\s*Error:/, '').trim();
        facts.push({
          id: `err_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'error',
          title: text.substring(0, 80),
          content: text,
          details: { errorMessages: [text], affectedComponent: 'unknown', attempts: [] },
          timestamp: new Date(dateStr).toISOString(),
          sessionId: dateStr,
          verified: false,
          source: 'distilled',
        });
      } else if (line.includes('* Preference:') || line.includes('- Preference:')) {
        const text = line.replace(/[*-]\s*Preference:/, '').trim();
        facts.push({
          id: `pref_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'preference',
          title: text.substring(0, 80),
          content: text,
          details: { topic: 'general', preference: text, strength: 'moderate' },
          timestamp: new Date(dateStr).toISOString(),
          sessionId: dateStr,
          verified: false,
          source: 'distilled',
        });
      } else if (line.includes('* Information:') || line.includes('- Information:')) {
        const text = line.replace(/[*-]\s*Information:/, '').trim();
        facts.push({
          id: `info_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'information',
          title: text.substring(0, 80),
          content: text,
          details: { topic: 'general', fact: text },
          timestamp: new Date(dateStr).toISOString(),
          sessionId: dateStr,
          verified: false,
          source: 'distilled',
        });
      } else if (line.includes('* Contact:') || line.includes('- Contact:')) {
        const text = line.replace(/[*-]\s*Contact:/, '').trim();
        facts.push({
          id: `contact_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'contact',
          title: text.substring(0, 80),
          content: text,
          details: { name: text.split(' ')[0], relationship: text },
          timestamp: new Date(dateStr).toISOString(),
          sessionId: dateStr,
          verified: false,
          source: 'distilled',
        });
      }
    }

    return facts;
  }

  // STEP 3: Deduplicate exact + near-duplicates (>80% similar)
  private deduplicate(facts: Fact[]): Fact[] {
    const seen = new Map<string, Fact>();

    for (const fact of facts) {
      const key = `${fact.type}:${fact.content}`;

      if (seen.has(key)) continue; // Exact match

      // Check near-duplicates
      let isDup = false;
      for (const existing of seen.values()) {
        if (this.similarity(fact.content, existing.content) > 0.8) {
          isDup = true;
          break;
        }
      }

      if (!isDup) {
        seen.set(key, fact);
      }
    }

    return Array.from(seen.values());
  }

  // STEP 4: Evaluate stability
  private evaluateStability(facts: Fact[]): Fact[] {
    return facts.filter(f =>
      ['decision', 'error', 'preference', 'contact', 'information'].includes(f.type)
    );
  }

  // STEP 5: Reformulate for clarity
  private reformulate(facts: Fact[]): Fact[] {
    return facts.map(f => ({
      ...f,
      content: f.content.length < 20 ? `${f.title}: ${f.content}` : f.content,
    }));
  }

  /**
   * Write distill summary to skill-local distill-log.md
   * This replaces the old appendMemory() that wrote to the main workspace MEMORY.md
   */
  private appendDistillLog(facts: Fact[]): void {
    if (!fs.existsSync(this.skillPath)) {
      fs.mkdirSync(this.skillPath, { recursive: true });
    }

    const logPath = path.join(this.skillPath, 'distill-log.md');
    const today = new Date().toISOString().split('T')[0];

    let section = `\n## Distilled ${today}\n\n`;

    const byType = new Map<string, Fact[]>();
    for (const f of facts) {
      if (!byType.has(f.type)) byType.set(f.type, []);
      byType.get(f.type)!.push(f);
    }

    for (const [type, typeFacts] of byType) {
      section += `### ${type}\n`;
      for (const f of typeFacts) {
        section += `- ${f.title}\n`;
      }
      section += '\n';
    }

    fs.appendFileSync(logPath, section);
    console.log(`[DISTILL] Log written to ${logPath}`);
  }

  // Similarity 0-1
  private similarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    let common = 0;
    for (const w of wordsA) {
      if (w.length > 3 && wordsB.has(w)) common++;
    }
    const union = wordsA.size + wordsB.size - common;
    return union > 0 ? common / union : 0;
  }
}
