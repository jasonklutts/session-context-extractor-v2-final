import { Fact } from './types';
export interface AtomicMetadata {
    created: string;
    updated: string;
    category: string;
    relatedFiles: string[];
    keywords: string[];
}
export declare class AtomicFileManager {
    private atomicDir;
    constructor(workspacePath: string);
    private ensureDirectories;
    /**
     * Write a fact as an atomic file
     */
    writeAtomicFact(fact: Fact, metadata?: Partial<AtomicMetadata>): string;
    /**
     * Update an atomic file with new information
     */
    updateAtomicFact(fact: Fact, metadata?: Partial<AtomicMetadata>): void;
    /**
     * Link related facts in atomic files
     */
    addRelation(fromFactId: string, toFactPath: string, description: string): void;
    /**
     * Get all atomic files for a system/category
     */
    getAtomicFilesForSystem(system: string): string[];
    /**
     * Generate index of all atomic files
     */
    generateIndex(): string;
    private getSubdirectory;
    private generateFilename;
    private findAtomicFile;
    private factToAtomicMarkdown;
    private generateKeywords;
    private capitalize;
}
//# sourceMappingURL=atomic.d.ts.map