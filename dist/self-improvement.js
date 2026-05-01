"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfImprovementManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SelfImprovementManager {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.learningsDir = path_1.default.join(workspacePath, '.learnings');
        this.ensureDir();
    }
    ensureDir() {
        if (!fs_1.default.existsSync(this.learningsDir)) {
            fs_1.default.mkdirSync(this.learningsDir, { recursive: true });
            this.createFiles();
        }
    }
    createFiles() {
        const files = {
            'LEARNINGS.md': '# Learnings\n\nCorrections, insights, knowledge gaps.\n\n',
            'ERRORS.md': '# Errors\n\nCommand failures and integration errors.\n\n',
            'FEATURE_REQUESTS.md': '# Feature Requests\n\nRequested capabilities.\n\n',
        };
        for (const [name, content] of Object.entries(files)) {
            fs_1.default.writeFileSync(path_1.default.join(this.learningsDir, name), content);
        }
    }
    /**
     * Log a learning (correction, insight, etc.)
     */
    logLearning(type, priority, summary, details) {
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
        fs_1.default.appendFileSync(path_1.default.join(this.learningsDir, 'LEARNINGS.md'), '\n' + content);
        return id;
    }
    /**
     * Log an error
     */
    logError(skill, errorMsg, details = '') {
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
        fs_1.default.appendFileSync(path_1.default.join(this.learningsDir, 'ERRORS.md'), '\n' + content);
        return id;
    }
    /**
     * Detect recurring patterns (>3 occurrences = systemic)
     */
    detectPatterns() {
        const patterns = new Map();
        // Read learnings
        const learningsPath = path_1.default.join(this.learningsDir, 'LEARNINGS.md');
        if (fs_1.default.existsSync(learningsPath)) {
            const content = fs_1.default.readFileSync(learningsPath, 'utf-8');
            const entries = content.match(/## \[LRN-[^\]]+\] (\w+)/g) || [];
            for (const entry of entries) {
                const type = entry.split('] ')[1];
                if (!patterns.has(type))
                    patterns.set(type, []);
                patterns.get(type).push(entry);
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
    promoteToMemory(entryId, destination, content) {
        const memoryPath = path_1.default.join(this.workspacePath, 'MEMORY.md');
        const promotion = `\n## Promoted from ${entryId}\n\n${content}\n`;
        if (fs_1.default.existsSync(memoryPath)) {
            fs_1.default.appendFileSync(memoryPath, promotion);
        }
        // Mark as promoted in learnings
        this.markPromoted(entryId);
    }
    markPromoted(entryId) {
        let content = fs_1.default.readFileSync(path_1.default.join(this.learningsDir, 'LEARNINGS.md'), 'utf-8');
        content = content.replace(new RegExp(`(## \\[${entryId}\\][\\s\\S]*?)status: pending`, 'gi'), `$1status: promoted`);
        fs_1.default.writeFileSync(path_1.default.join(this.learningsDir, 'LEARNINGS.md'), content);
    }
    /**
     * Generate self-review report (from self-improvement.md scorecard)
     */
    generateSelfReview() {
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
    readEntries(filename) {
        const filepath = path_1.default.join(this.learningsDir, filename);
        if (!fs_1.default.existsSync(filepath))
            return [];
        const content = fs_1.default.readFileSync(filepath, 'utf-8');
        return content.match(/## \[[^\]]+\]/g) || [];
    }
    dateId() {
        return new Date().toISOString().split('T')[0].replace(/-/g, '');
    }
    randomId() {
        return Math.random().toString(36).substr(2, 5).toUpperCase();
    }
}
exports.SelfImprovementManager = SelfImprovementManager;
//# sourceMappingURL=self-improvement.js.map