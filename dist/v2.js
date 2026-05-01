"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystemV2 = void 0;
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const vault_writer_1 = require("./vault-writer");
const distillation_1 = require("./distillation");
const retrieval_strategies_1 = require("./retrieval-strategies");
const self_improvement_1 = require("./self-improvement");
const cron_1 = require("./cron");
const atomic_1 = require("./atomic");
const graph_1 = require("./graph");
/**
 * COMPLETE SYSTEM: 5-Layer OpenClaw Architecture
 *
 * Layer 1: CAPTURE → memory/dailies/YYYY-MM-DD.md (handled by user)
 * Layer 2: DISTILLATION → Auto-extract via cron daily at 21:00
 * Layer 3: ATOMIC STORAGE → One fact per file (context-vault/atomic/)
 * Layer 4: GRAPH LINKING → Relationship detection
 * Layer 5: RETRIEVAL → 8 strategies for finding information
 *
 * SELF-IMPROVEMENT: Pattern detection, promotion to MEMORY.md
 */
class MemorySystemV2 {
    constructor(workspacePath = process.env.OPENCLAW_WORKSPACE || path_1.default.join(process.env.HOME || '', '.openclaw', 'workspace')) {
        this.workspacePath = workspacePath;
        this.db = new db_1.VaultDatabase(workspacePath);
        this.writer = new vault_writer_1.VaultWriter(workspacePath);
        this.distillation = new distillation_1.DistillationEngine(workspacePath, this.db, this.writer);
        this.retrieval = new retrieval_strategies_1.RetrievalSystem();
        this.selfImprovement = new self_improvement_1.SelfImprovementManager(workspacePath);
        this.cron = new cron_1.CronManager(workspacePath);
        this.atomic = new atomic_1.AtomicFileManager(workspacePath);
        this.graph = new graph_1.GraphLinkManager(workspacePath);
    }
    async initialize() {
        console.log('[V2] Initializing Memory System v2...');
        await this.db.initialize();
        await this.cron.initialize();
        console.log('[V2] Ready');
    }
    // LAYER 2: Start cron distillation
    startCron() {
        console.log('[V2] Starting daily distillation cron (21:00)');
        this.cron.startDistillationCron();
    }
    // LAYER 2: Manual distillation (for testing)
    async distill() {
        console.log('[V2] Running distillation...');
        await this.distillation.distillAll();
        console.log('[V2] Distillation complete');
        // Auto-update relationships after distillation
        const allFacts = this.db.getRecentFacts(7);
        if (allFacts.length > 0) {
            this.graph.autoLinkFacts(allFacts.map(f => ({ id: f.id, content: f.content, title: f.title })));
        }
    }
    // LAYER 5: Query with all 8 retrieval strategies
    query(queryText) {
        console.log(`[V2] Query: "${queryText}"\n`);
        const allFacts = this.db.getRecentFacts(30); // Get recent facts
        const results = this.retrieval.search(queryText, allFacts);
        if (results.length === 0) {
            console.log('No results found.\n');
            return;
        }
        console.log(`Found ${results.length} results:\n`);
        for (const { fact, score } of results.slice(0, 5)) {
            console.log(`[${(score * 100).toFixed(0)}%] ${fact.title}`);
            console.log(`  ${fact.content.substring(0, 100)}...`);
            // Show related facts
            const relations = this.graph.getRelations(fact.id);
            if (relations.length > 0) {
                console.log(`  Related: ${relations.map(r => r.description).join(', ')}`);
            }
            console.log();
        }
    }
    // LAYER 3: List facts
    list(type) {
        const facts = type ? this.db.getFactsByType(type, 20) : this.db.getRecentFacts(7);
        if (facts.length === 0) {
            console.log(`No ${type ? type : 'recent'} facts found.`);
            return;
        }
        console.log(`${type ? type : 'Recent'} facts:\n`);
        for (const f of facts) {
            const verify = f.verified ? '✓' : '○';
            console.log(`[${verify}] ${f.type} - ${f.title}`);
        }
    }
    // Self-review
    review() {
        console.log(this.selfImprovement.generateSelfReview());
    }
    // LAYER 4: Show graph
    showGraph() {
        console.log(this.graph.generateGraphVisualization());
    }
    close() {
        this.cron.close();
        this.db.close();
    }
}
exports.MemorySystemV2 = MemorySystemV2;
// CLI
if (require.main === module) {
    const cmd = process.argv[2];
    const args = process.argv.slice(3);
    const system = new MemorySystemV2();
    (async () => {
        try {
            await system.initialize();
            switch (cmd) {
                case 'start-cron':
                    system.startCron();
                    setInterval(() => { }, 1000);
                    break;
                case 'distill':
                    await system.distill();
                    system.close();
                    break;
                case 'query':
                    system.query(args.join(' '));
                    system.close();
                    break;
                case 'list':
                    system.list(args[0]);
                    system.close();
                    break;
                case 'review':
                    system.review();
                    system.close();
                    break;
                case 'graph':
                    system.showGraph();
                    system.close();
                    break;
                default:
                    console.log(`
Session Context Extractor — V2 Production

Commands:
  start-cron          Start daily distillation at 21:00
  distill             Run distillation immediately
  query "<text>"      Search with 8 retrieval strategies
  list [type]         List facts (decision|error|preference|contact)
  review              Self-improvement report
  graph               Relationship visualization

Example:
  npm run v2:distill
  npm run v2:query "What did we decide about OCI?"
          `);
                    system.close();
            }
        }
        catch (error) {
            console.error('[V2] Error:', error);
            system.close();
            process.exit(1);
        }
    })();
}
exports.default = MemorySystemV2;
//# sourceMappingURL=v2.js.map