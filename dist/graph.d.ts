export interface GraphRelation {
    fromId: string;
    toId: string;
    type: 'related' | 'depends_on' | 'referenced_by' | 'similar_to';
    description: string;
}
export declare class GraphLinkManager {
    private atomicDir;
    private relations;
    constructor(workspacePath: string);
    /**
     * Add a relationship between two facts
     */
    addRelation(fromId: string, toId: string, type: GraphRelation['type'], description: string): void;
    /**
     * Get all relations for a fact
     */
    getRelations(factId: string): GraphRelation[];
    /**
     * Auto-detect and link related facts
     */
    autoLinkFacts(facts: Array<{
        id: string;
        content: string;
        title: string;
    }>): void;
    /**
     * Build graph links based on keyword matching
     */
    linkByKeywords(fromId: string, keywords: string[]): void;
    /**
     * Update atomic file with links
     */
    updateRelatedSection(factId: string): void;
    /**
     * Generate relationship visualization
     */
    generateGraphVisualization(): string;
    private calculateSimilarity;
    private getAllAtomicFiles;
    private findAtomicFileById;
    private extractTitle;
    private loadRelations;
    private saveRelations;
}
//# sourceMappingURL=graph.d.ts.map