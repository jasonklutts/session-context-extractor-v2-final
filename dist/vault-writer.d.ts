import { Fact } from './types';
export declare class VaultWriter {
    private vaultDir;
    constructor(workspacePath: string);
    private ensureVaultExists;
    writeFact(fact: Fact): void;
    writeIndex(facts: Fact[]): void;
    private groupByType;
    private generateFilename;
    private factToMarkdown;
    private formatDecision;
    private formatError;
    private formatPreference;
    private formatContact;
    private capitalize;
}
//# sourceMappingURL=vault-writer.d.ts.map