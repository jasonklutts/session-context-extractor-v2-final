"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultWriter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class VaultWriter {
    constructor(workspacePath) {
        this.vaultDir = path_1.default.join(workspacePath, 'context-vault');
        this.ensureVaultExists();
    }
    ensureVaultExists() {
        if (!fs_1.default.existsSync(this.vaultDir)) {
            fs_1.default.mkdirSync(this.vaultDir, { recursive: true });
        }
    }
    writeFact(fact) {
        const typeDir = path_1.default.join(this.vaultDir, 'atomic', fact.type);
        if (!fs_1.default.existsSync(typeDir)) {
            fs_1.default.mkdirSync(typeDir, { recursive: true });
        }
        const filename = this.generateFilename(fact);
        const filepath = path_1.default.join(typeDir, filename);
        const markdown = this.factToMarkdown(fact);
        fs_1.default.writeFileSync(filepath, markdown, 'utf-8');
    }
    writeIndex(facts) {
        const indexPath = path_1.default.join(this.vaultDir, 'INDEX.md');
        let content = '# Context Vault Index\n\n';
        content += `Last updated: ${new Date().toISOString()}\n\n`;
        const byType = this.groupByType(facts);
        for (const [type, typeFacts] of Object.entries(byType)) {
            content += `## ${this.capitalize(type)}s (${typeFacts.length})\n\n`;
            for (const fact of typeFacts) {
                const verified = fact.verified ? '✓' : '○';
                const date = new Date(fact.timestamp).toLocaleDateString();
                content += `- [${verified}] **${fact.title}** (${date})\n`;
                if (fact.system) {
                    content += `  - System: ${fact.system}\n`;
                }
            }
            content += '\n';
        }
        fs_1.default.writeFileSync(indexPath, content, 'utf-8');
    }
    groupByType(facts) {
        const grouped = {
            decision: [],
            error: [],
            preference: [],
            contact: [],
            information: [],
        };
        for (const fact of facts) {
            grouped[fact.type].push(fact);
        }
        return grouped;
    }
    generateFilename(fact) {
        const date = new Date(fact.timestamp).toISOString().split('T')[0];
        const title = fact.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 40);
        return `${date}-${title}.md`;
    }
    factToMarkdown(fact) {
        let content = `# ${fact.title}\n\n`;
        content += `**Type:** ${fact.type}\n`;
        content += `**Date:** ${new Date(fact.timestamp).toLocaleString()}\n`;
        content += `**Status:** ${fact.verified ? 'Verified' : 'Unverified'}\n`;
        if (fact.system) {
            content += `**System:** ${fact.system}\n`;
        }
        if (fact.source) {
            content += `**Source:** ${fact.source}\n`;
        }
        content += '\n---\n\n';
        content += `## Summary\n\n${fact.content}\n\n`;
        switch (fact.type) {
            case 'decision':
                content += this.formatDecision(fact);
                break;
            case 'error':
                content += this.formatError(fact);
                break;
            case 'preference':
                content += this.formatPreference(fact);
                break;
            case 'contact':
                content += this.formatContact(fact);
                break;
        }
        return content;
    }
    formatDecision(fact) {
        let content = '## Decision Details\n\n';
        if (fact.details.choice) {
            content += `**Choice Made:** ${fact.details.choice}\n\n`;
        }
        if (fact.details.reasoning) {
            content += `**Reasoning:** ${fact.details.reasoning}\n\n`;
        }
        if (fact.details.constraints && fact.details.constraints.length > 0) {
            content += `**Constraints:**\n`;
            for (const constraint of fact.details.constraints) {
                content += `- ${constraint}\n`;
            }
            content += '\n';
        }
        if (fact.details.rejected && fact.details.rejected.length > 0) {
            content += `**Rejected Alternatives:**\n`;
            for (const alt of fact.details.rejected) {
                content += `- ${alt}\n`;
            }
            content += '\n';
        }
        if (fact.details.revisitTrigger) {
            content += `**Revisit Trigger:** ${fact.details.revisitTrigger}\n\n`;
        }
        return content;
    }
    formatError(fact) {
        let content = '## Error Details\n\n';
        if (fact.details.affectedComponent) {
            content += `**Affected Component:** ${fact.details.affectedComponent}\n\n`;
        }
        if (fact.details.errorMessages && fact.details.errorMessages.length > 0) {
            content += `**Error Messages:**\n\`\`\`\n`;
            for (const msg of fact.details.errorMessages) {
                content += `${msg}\n`;
            }
            content += `\`\`\`\n\n`;
        }
        if (fact.details.attempts && fact.details.attempts.length > 0) {
            content += `**Attempts Made:**\n`;
            for (let i = 0; i < fact.details.attempts.length; i++) {
                const attempt = fact.details.attempts[i];
                content += `${i + 1}. ${attempt.description} — **${attempt.outcome}**\n`;
                if (attempt.details) {
                    content += `   ${attempt.details}\n`;
                }
            }
            content += '\n';
        }
        if (fact.details.resolution) {
            content += `**Resolution:** ${fact.details.resolution}\n\n`;
        }
        if (fact.details.lessons && fact.details.lessons.length > 0) {
            content += `**Lessons Learned:**\n`;
            for (const lesson of fact.details.lessons) {
                content += `- ${lesson}\n`;
            }
            content += '\n';
        }
        return content;
    }
    formatPreference(fact) {
        let content = '## Preference Details\n\n';
        if (fact.details.topic) {
            content += `**Topic:** ${fact.details.topic}\n\n`;
        }
        if (fact.details.preference) {
            content += `**Preference:** ${fact.details.preference}\n\n`;
        }
        if (fact.details.context) {
            content += `**Context:** ${fact.details.context}\n\n`;
        }
        content += `**Strength:** ${fact.details.strength}\n\n`;
        return content;
    }
    formatContact(fact) {
        let content = '## Contact Details\n\n';
        if (fact.details.name) {
            content += `**Name:** ${fact.details.name}\n\n`;
        }
        if (fact.details.relationship) {
            content += `**Relationship:** ${fact.details.relationship}\n\n`;
        }
        if (fact.details.context) {
            content += `**Context:** ${fact.details.context}\n\n`;
        }
        return content;
    }
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
exports.VaultWriter = VaultWriter;
//# sourceMappingURL=vault-writer.js.map