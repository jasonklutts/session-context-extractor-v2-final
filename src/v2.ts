import path from 'path';
import { VaultDatabase } from './db';
import { VaultWriter } from './vault-writer';
import { DistillationEngine } from './distillation';
import { RetrievalSystem } from './retrieval-strategies';
import { SelfImprovementManager } from './self-improvement';
import { CronManager } from './cron';
import { AtomicFileManager } from './atomic';
import { GraphLinkManager } from './graph';

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
export class MemorySystemV2 {
  private workspacePath: string;
  private db: VaultDatabase;
  private writer: VaultWriter;
  private distillation: DistillationEngine;
  private retrieval: RetrievalSystem;
  private selfImprovement: SelfImprovementManager;
  private cron: CronManager;
  private atomic: AtomicFileManager;
  private graph: GraphLinkManager;

  constructor(workspacePath: string = path.join(process.env.HOME || '', '.openclaw', 'workspace')) {
    this.workspacePath = workspacePath;
    this.db = new VaultDatabase(workspacePath);
    this.writer = new VaultWriter(workspacePath);
    this.distillation = new DistillationEngine(workspacePath, this.db, this.writer);
    this.retrieval = new RetrievalSystem();
    this.selfImprovement = new SelfImprovementManager(workspacePath);
    this.cron = new CronManager(workspacePath);
    this.atomic = new AtomicFileManager(workspacePath);
    this.graph = new GraphLinkManager(workspacePath);
  }

  async initialize(): Promise<void> {
    console.log('[V2] Initializing Memory System v2...');
    await this.db.initialize();
    await this.cron.initialize();
    console.log('[V2] Ready');
  }

  // LAYER 2: Start cron distillation
  startCron(): void {
    console.log('[V2] Starting daily distillation cron (21:00)');
    this.cron.startDistillationCron();
  }

  // LAYER 2: Manual distillation (for testing)
  async distill(): Promise<void> {
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
  query(queryText: string): void {
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
  list(type?: string): void {
    const facts = type ? this.db.getByType(type as any, 20) : this.db.getRecentFacts(7);

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
  review(): void {
    console.log(this.selfImprovement.generateSelfReview());
  }

  // LAYER 4: Show graph
  showGraph(): void {
    console.log(this.graph.generateGraphVisualization());
  }

  close(): void {
    this.cron.close();
    this.db.close();
  }
}

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
          setInterval(() => {}, 1000);
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
    } catch (error) {
      console.error('[V2] Error:', error);
      system.close();
      process.exit(1);
    }
  })();
}

export default MemorySystemV2;
