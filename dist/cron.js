"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronManager = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("./db");
const vault_writer_1 = require("./vault-writer");
const distillation_1 = require("./distillation");
const path_1 = __importDefault(require("path"));
class CronManager {
    constructor(workspacePath, timezone = 'America/Chicago') {
        this.job = null;
        this.workspacePath = workspacePath;
        this.timezone = timezone;
        this.db = new db_1.VaultDatabase(workspacePath);
        this.writer = new vault_writer_1.VaultWriter(workspacePath);
        this.distillation = new distillation_1.DistillationEngine(workspacePath, this.db, this.writer);
    }
    async initialize() {
        await this.db.initialize();
    }
    /**
     * Start daily distillation cron job at 21:00 in specified timezone
     */
    startDistillationCron() {
        // Cron expression: 0 21 * * * (21:00 every day)
        // node-cron with timezone support
        const expression = '0 21 * * *';
        this.job = node_cron_1.default.schedule(expression, async () => {
            console.log(`[CRON] Starting distillation at ${new Date().toISOString()}`);
            try {
                await this.distillation.distillAll();
                await this.selfReview();
                console.log('[CRON] Distillation complete');
            }
            catch (error) {
                console.error('[CRON] Error during distillation:', error);
                this.logError(error);
            }
        }, {
            timezone: this.timezone,
        });
        console.log(`[CRON] Distillation scheduled for 21:00 ${this.timezone}`);
    }
    /**
     * Self-review: check .learnings/ and promote important entries
     */
    async selfReview() {
        const learningsDir = path_1.default.join(this.workspacePath, '.learnings');
        console.log('[SELF-REVIEW] Checking learnings...');
        // TODO: Implement self-review logic
        // - Read .learnings/LEARNINGS.md, ERRORS.md, FEATURE_REQUESTS.md
        // - Detect patterns
        // - Promote to MEMORY.md if needed
        // - Update atomic files
    }
    logError(error) {
        const errorsPath = path_1.default.join(this.workspacePath, '.learnings', 'ERRORS.md');
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
        }
        catch (e) {
            console.error('Could not log error:', e);
        }
    }
    /**
     * Stop the cron job
     */
    stop() {
        if (this.job) {
            this.job.stop();
            console.log('[CRON] Distillation job stopped');
        }
    }
    /**
     * Set timezone for cron (for portability)
     */
    setTimezone(tz) {
        this.timezone = tz;
        console.log(`[CRON] Timezone set to ${tz}`);
    }
    /**
     * Run distillation immediately (for testing)
     */
    async runNow() {
        console.log('[CRON] Running distillation immediately...');
        try {
            await this.distillation.distillAll();
            await this.selfReview();
            console.log('[CRON] Immediate distillation complete');
        }
        catch (error) {
            console.error('[CRON] Error:', error);
            this.logError(error);
        }
    }
    close() {
        this.stop();
        this.db.close();
    }
}
exports.CronManager = CronManager;
//# sourceMappingURL=cron.js.map