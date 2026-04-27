import cron from 'node-cron';
import { VaultDatabase } from './db';
import { VaultWriter } from './vault-writer';
import { DistillationEngine } from './distillation';
import path from 'path';

export class CronManager {
  private workspacePath: string;
  private db: VaultDatabase;
  private writer: VaultWriter;
  private distillation: DistillationEngine;
  private job: cron.ScheduledTask | null = null;
  private timezone: string;

  constructor(workspacePath: string, timezone: string = 'America/Chicago') {
    this.workspacePath = workspacePath;
    this.timezone = timezone;
    this.db = new VaultDatabase(workspacePath);
    this.writer = new VaultWriter(workspacePath);
    this.distillation = new DistillationEngine(workspacePath, this.db, this.writer);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * Start daily distillation cron job at 21:00 in specified timezone
   */
  startDistillationCron(): void {
    // Cron expression: 0 21 * * * (21:00 every day)
    // node-cron with timezone support
    const expression = '0 21 * * *';

    this.job = cron.schedule(
      expression,
      async () => {
        console.log(`[CRON] Starting distillation at ${new Date().toISOString()}`);
        try {
          await this.distillation.distillAll();
          await this.selfReview();
          console.log('[CRON] Distillation complete');
        } catch (error) {
          console.error('[CRON] Error during distillation:', error);
          this.logError(error);
        }
      },
      {
        timezone: this.timezone,
      }
    );

    console.log(`[CRON] Distillation scheduled for 21:00 ${this.timezone}`);
  }

  /**
   * Self-review: check .learnings/ and promote important entries
   */
  private async selfReview(): Promise<void> {
    const learningsDir = path.join(this.workspacePath, '.learnings');
    console.log('[SELF-REVIEW] Checking learnings...');

    // TODO: Implement self-review logic
    // - Read .learnings/LEARNINGS.md, ERRORS.md, FEATURE_REQUESTS.md
    // - Detect patterns
    // - Promote to MEMORY.md if needed
    // - Update atomic files
  }

  private logError(error: unknown): void {
    const errorsPath = path.join(this.workspacePath, '.learnings', 'ERRORS.md');
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error);

    let content = `## [ERR-${timestamp.split('T')[0].replace(/-/g, '')}] cron_distillation\n\n`;
    content += `**Logged**: ${timestamp}\n`;
    content += `**Priority**: high\n`;
    content += `**Status**: pending\n\n`;
    content += `### Summary\nDistillation cron job failed\n\n`;
    content += `### Error\n${errorMsg}\n`;

    // Append to errors file if it exists
    try {
      const fs = require('fs');
      if (fs.existsSync(errorsPath)) {
        fs.appendFileSync(errorsPath, '\n' + content);
      }
    } catch (e) {
      console.error('Could not log error:', e);
    }
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      console.log('[CRON] Distillation job stopped');
    }
  }

  /**
   * Set timezone for cron (for portability)
   */
  setTimezone(tz: string): void {
    this.timezone = tz;
    console.log(`[CRON] Timezone set to ${tz}`);
  }

  /**
   * Run distillation immediately (for testing)
   */
  async runNow(): Promise<void> {
    console.log('[CRON] Running distillation immediately...');
    try {
      await this.distillation.distillAll();
      await this.selfReview();
      console.log('[CRON] Immediate distillation complete');
    } catch (error) {
      console.error('[CRON] Error:', error);
      this.logError(error);
    }
  }

  close(): void {
    this.stop();
    this.db.close();
  }
}
