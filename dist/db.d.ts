import { Fact, FactType } from './types';
export declare class VaultDatabase {
    private db;
    private dbPath;
    private vaultDir;
    private initialized;
    constructor(workspacePath: string);
    initialize(): Promise<void>;
    private initializeSchema;
    saveFact(fact: Fact): void;
    getFact(id: string): Fact | null;
    searchFacts(query: string, type?: FactType, system?: string, verifiedOnly?: boolean): Fact[];
    getFactsByType(type: FactType, limit?: number): Fact[];
    getRecentFacts(days?: number): Fact[];
    verifyFact(id: string): void;
    updateFact(id: string, updates: Partial<Fact>): void;
    deleteFact(id: string): void;
    private logAudit;
    private rowToFact;
    private save;
    close(): void;
}
//# sourceMappingURL=db.d.ts.map