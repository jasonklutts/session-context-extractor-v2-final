"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphLinkManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class GraphLinkManager {
    constructor(workspacePath) {
        this.relations = new Map();
        this.atomicDir = path_1.default.join(workspacePath, 'context-vault', 'atomic');
        this.loadRelations();
    }
    /**
     * Add a relationship between two facts
     */
    addRelation(fromId, toId, type, description) {
        const relation = { fromId, toId, type, description };
        if (!this.relations.has(fromId)) {
            this.relations.set(fromId, []);
        }
        // Check if relation already exists
        const existing = this.relations.get(fromId).find(r => r.toId === toId && r.type === type);
        if (existing)
            return;
        this.relations.get(fromId).push(relation);
        this.saveRelations();
    }
    /**
     * Get all relations for a fact
     */
    getRelations(factId) {
        return this.relations.get(factId) || [];
    }
    /**
     * Auto-detect and link related facts
     */
    autoLinkFacts(facts) {
        for (let i = 0; i < facts.length; i++) {
            for (let j = i + 1; j < facts.length; j++) {
                const similarity = this.calculateSimilarity(facts[i], facts[j]);
                if (similarity > 0.5) {
                    this.addRelation(facts[i].id, facts[j].id, 'related', `Related by keyword overlap (${(similarity * 100).toFixed(0)}% similar)`);
                }
            }
        }
    }
    /**
     * Build graph links based on keyword matching
     */
    linkByKeywords(fromId, keywords) {
        const allFiles = this.getAllAtomicFiles();
        for (const file of allFiles) {
            if (file.factId === fromId)
                continue;
            const fileContent = fs_1.default.readFileSync(file.path, 'utf-8').toLowerCase();
            const matchedKeywords = keywords.filter(k => fileContent.includes(k.toLowerCase()));
            if (matchedKeywords.length > 0) {
                this.addRelation(fromId, file.factId, 'related', `Keyword match: ${matchedKeywords.join(', ')}`);
            }
        }
    }
    /**
     * Update atomic file with links
     */
    updateRelatedSection(factId) {
        const file = this.findAtomicFileById(factId);
        if (!file)
            return;
        const relations = this.getRelations(factId);
        if (relations.length === 0)
            return;
        let content = fs_1.default.readFileSync(file, 'utf-8');
        // Remove old Related: section
        content = content.replace(/### Related:[\s\S]*?(?=###|$)/, '');
        // Add new Related: section
        let relatedSection = '\n### Related:\n';
        for (const rel of relations) {
            const relFile = this.findAtomicFileById(rel.toId);
            if (relFile) {
                const relativePath = path_1.default.relative(path_1.default.dirname(file), relFile);
                relatedSection += `* [${rel.description}](./${relativePath})\n`;
            }
        }
        content += relatedSection;
        fs_1.default.writeFileSync(file, content, 'utf-8');
    }
    /**
     * Generate relationship visualization
     */
    generateGraphVisualization() {
        let viz = '# Memory Graph\n\n';
        viz += 'Relationship map between facts.\n\n';
        const nodes = new Set();
        for (const [from, relations] of this.relations.entries()) {
            nodes.add(from);
            for (const rel of relations) {
                nodes.add(rel.toId);
            }
        }
        viz += `## Nodes (${nodes.size})\n`;
        for (const node of Array.from(nodes).sort()) {
            const file = this.findAtomicFileById(node);
            const title = file ? this.extractTitle(file) : node;
            viz += `- ${node}: ${title}\n`;
        }
        viz += `\n## Relations (${Array.from(this.relations.values()).reduce((acc, r) => acc + r.length, 0)})\n\n`;
        for (const [from, rels] of this.relations.entries()) {
            for (const rel of rels) {
                viz += `- ${from} --[${rel.type}]--> ${rel.toId}\n`;
                viz += `  "${rel.description}"\n`;
            }
        }
        return viz;
    }
    calculateSimilarity(factA, factB) {
        const wordsA = new Set((factA.content + ' ' + factA.title).toLowerCase().split(/\s+/));
        const wordsB = new Set((factB.content + ' ' + factB.title).toLowerCase().split(/\s+/));
        let intersection = 0;
        for (const word of wordsA) {
            if (word.length > 3 && wordsB.has(word)) {
                intersection++;
            }
        }
        const union = wordsA.size + wordsB.size - intersection;
        return union > 0 ? intersection / union : 0;
    }
    getAllAtomicFiles() {
        const files = [];
        const subdirs = ['decisions', 'errors', 'projects', 'tools', 'people', 'ideas'];
        for (const subdir of subdirs) {
            const subdirPath = path_1.default.join(this.atomicDir, subdir);
            if (!fs_1.default.existsSync(subdirPath))
                continue;
            const entries = fs_1.default.readdirSync(subdirPath);
            for (const entry of entries) {
                const filePath = path_1.default.join(subdirPath, entry);
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const idMatch = content.match(/- \*\*ID\*\*: (.+?)$/m);
                if (idMatch) {
                    files.push({ path: filePath, factId: idMatch[1] });
                }
            }
        }
        return files;
    }
    findAtomicFileById(factId) {
        const allFiles = this.getAllAtomicFiles();
        const file = allFiles.find(f => f.factId === factId);
        return file ? file.path : null;
    }
    extractTitle(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const titleMatch = content.match(/^# (.+?)$/m);
        return titleMatch ? titleMatch[1] : path_1.default.basename(filePath);
    }
    loadRelations() {
        const relFile = path_1.default.join(path_1.default.dirname(this.atomicDir), 'relations.json');
        if (fs_1.default.existsSync(relFile)) {
            try {
                const data = JSON.parse(fs_1.default.readFileSync(relFile, 'utf-8'));
                for (const [fromId, rels] of Object.entries(data)) {
                    this.relations.set(fromId, rels);
                }
            }
            catch (e) {
                console.error('Error loading relations:', e);
            }
        }
    }
    saveRelations() {
        const relFile = path_1.default.join(path_1.default.dirname(this.atomicDir), 'relations.json');
        const data = {};
        for (const [fromId, rels] of this.relations.entries()) {
            data[fromId] = rels;
        }
        fs_1.default.writeFileSync(relFile, JSON.stringify(data, null, 2));
    }
}
exports.GraphLinkManager = GraphLinkManager;
//# sourceMappingURL=graph.js.map