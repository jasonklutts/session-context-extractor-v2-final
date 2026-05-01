"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistillationEngine = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * OpenClaw Phase 2: DISTILLATION
 *
 * EXACT PIPELINE from memory-pipeline.md:
 * 1. READ .last_distill_date
 * 2. FOR EACH daily: Extract Decision/Information/Insight/Error lines
 * 3. DEDUPLICATE: Remove exact + near-duplicates (>80% similar)
 * 4. EVALUATE STABILITY: Keep only facts lasting >1 month (or critical)
 * 5. REFORMULATE: Rewrite clearly for retrieval
 * 6. DISTRIBUTE: Write to MEMORY.md, atomic files
 * 7. WRITE .last_distill_date = today
 */
class DistillationEngine {
    constructor(workspacePath, db, writer) {
        this.workspacePath = workspacePath;
        this.db = db;
        this.writer = writer;
    }
    async distillAll() {
        const dailiesDir = path_1.default.join(this.workspacePath, 'memory', 'dailies');
        const stateFile = path_1.default.join(this.workspacePath, '.last_distill_date');
        if (!fs_1.default.existsSync(dailiesDir)) {
            console.log('[DISTILL] No dailies directory');
            return;
        }
        // STEP 1: READ .last_distill_date
        let lastDate = '';
        if (fs_1.default.existsSync(stateFile)) {
            lastDate = fs_1.default.readFileSync(stateFile, 'utf-8').trim();
        }
        console.log(`[DISTILL] Processing since: ${lastDate || 'beginning'}`);
        const files = fs_1.default.readdirSync(dailiesDir).filter(f => f.endsWith('.md')).sort();
        const allFacts = [];
        // STEP 2: FOR EACH daily — Extract Decision/Information/Insight/Error
        for (const file of files) {
            const dateStr = file.replace('.md', '');
            if (lastDate && dateStr <= lastDate)
                continue;
            const filePath = path_1.default.join(dailiesDir, file);
            console.log(`[DISTILL] Extracting: ${file}`);
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
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
        // STEP 6: DISTRIBUTE
        for (const fact of reformulated) {
            this.db.saveFact(fact);
            this.writer.writeFact(fact);
        }
        // Update MEMORY.md
        this.appendMemory(reformulated);
        // STEP 7: WRITE .last_distill_date
        const today = new Date().toISOString().split('T')[0];
        fs_1.default.writeFileSync(stateFile, today);
        console.log(`[DISTILL] Complete. Stored ${reformulated.length} facts.`);
    }
    // Extract lines matching * Decision: / * Information: / * Error: / * Preference: / * Contact:
    extractLines(content, dateStr) {
        const facts = [];
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.includes('* Decision:')) {
                const text = line.replace('* Decision:', '').trim();
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
            }
            else if (line.includes('* Error:')) {
                const text = line.replace('* Error:', '').trim();
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
            }
            else if (line.includes('* Preference:')) {
                const text = line.replace('* Preference:', '').trim();
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
            }
            else if (line.includes('* Information:')) {
                const text = line.replace('* Information:', '').trim();
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
            }
            else if (line.includes('* Contact:')) {
                const text = line.replace('* Contact:', '').trim();
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
    deduplicate(facts) {
        const seen = new Map();
        for (const fact of facts) {
            const key = `${fact.type}:${fact.content}`;
            if (seen.has(key))
                continue; // Exact match
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
    // STEP 4: Evaluate stability (keep strategic decisions, errors, preferences, contacts, information)
    evaluateStability(facts) {
        // Keep: decision, error, preference, contact, information
        // Discard: contextual logs, transient thoughts
        return facts.filter(f => ['decision', 'error', 'preference', 'contact', 'information'].includes(f.type));
    }
    // STEP 5: Reformulate for clarity
    reformulate(facts) {
        return facts.map(f => ({
            ...f,
            content: f.content.length < 20 ? `${f.title}: ${f.content}` : f.content,
        }));
    }
    // Append distilled section to MEMORY.md
    appendMemory(facts) {
        const memPath = path_1.default.join(this.workspacePath, 'MEMORY.md');
        const today = new Date().toISOString().split('T')[0];
        let section = `\n## Distilled ${today}\n\n`;
        const byType = new Map();
        for (const f of facts) {
            if (!byType.has(f.type))
                byType.set(f.type, []);
            byType.get(f.type).push(f);
        }
        for (const [type, typeFacts] of byType) {
            section += `### ${type}\n`;
            for (const f of typeFacts) {
                section += `- ${f.title}\n`;
            }
            section += '\n';
        }
        if (fs_1.default.existsSync(memPath)) {
            fs_1.default.appendFileSync(memPath, section);
        }
    }
    // Similarity 0-1
    similarity(a, b) {
        const wordsA = new Set(a.toLowerCase().split(/\s+/));
        const wordsB = new Set(b.toLowerCase().split(/\s+/));
        let common = 0;
        for (const w of wordsA) {
            if (w.length > 3 && wordsB.has(w))
                common++;
        }
        const union = wordsA.size + wordsB.size - common;
        return union > 0 ? common / union : 0;
    }
}
exports.DistillationEngine = DistillationEngine;
//# sourceMappingURL=distillation.js.map