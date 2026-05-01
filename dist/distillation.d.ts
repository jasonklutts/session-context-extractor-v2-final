import { VaultDatabase } from './db';
import { VaultWriter } from './vault-writer';
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
export declare class DistillationEngine {
    private db;
    private writer;
    private workspacePath;
    constructor(workspacePath: string, db: VaultDatabase, writer: VaultWriter);
    distillAll(): Promise<void>;
    private extractLines;
    private deduplicate;
    private evaluateStability;
    private reformulate;
    private appendMemory;
    private similarity;
}
//# sourceMappingURL=distillation.d.ts.map