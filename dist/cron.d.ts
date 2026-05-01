export declare class CronManager {
    private workspacePath;
    private db;
    private writer;
    private distillation;
    private job;
    private timezone;
    constructor(workspacePath: string, timezone?: string);
    initialize(): Promise<void>;
    /**
     * Start daily distillation cron job at 21:00 in specified timezone
     */
    startDistillationCron(): void;
    /**
     * Self-review: check .learnings/ and promote important entries
     */
    private selfReview;
    private logError;
    /**
     * Stop the cron job
     */
    stop(): void;
    /**
     * Set timezone for cron (for portability)
     */
    setTimezone(tz: string): void;
    /**
     * Run distillation immediately (for testing)
     */
    runNow(): Promise<void>;
    close(): void;
}
//# sourceMappingURL=cron.d.ts.map