import fs from 'fs';
import path from 'path';

export interface GraphRelation {
  fromId: string;
  toId: string;
  type: 'related' | 'depends_on' | 'referenced_by' | 'similar_to';
  description: string;
}

export class GraphLinkManager {
  private atomicDir: string;
  private relations: Map<string, GraphRelation[]> = new Map();

  constructor(workspacePath: string) {
    this.atomicDir = path.join(workspacePath, 'context-vault', 'atomic');
    this.loadRelations();
  }

  /**
   * Add a relationship between two facts
   */
  addRelation(fromId: string, toId: string, type: GraphRelation['type'], description: string): void {
    const relation: GraphRelation = { fromId, toId, type, description };

    if (!this.relations.has(fromId)) {
      this.relations.set(fromId, []);
    }

    // Check if relation already exists
    const existing = this.relations.get(fromId)!.find(r => r.toId === toId && r.type === type);
    if (existing) return;

    this.relations.get(fromId)!.push(relation);
    this.saveRelations();
  }

  /**
   * Get all relations for a fact
   */
  getRelations(factId: string): GraphRelation[] {
    return this.relations.get(factId) || [];
  }

  /**
   * Auto-detect and link related facts
   */
  autoLinkFacts(facts: Array<{ id: string; content: string; title: string }>): void {
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const similarity = this.calculateSimilarity(facts[i], facts[j]);

        if (similarity > 0.5) {
          this.addRelation(
            facts[i].id,
            facts[j].id,
            'related',
            `Related by keyword overlap (${(similarity * 100).toFixed(0)}% similar)`
          );
        }
      }
    }
  }

  /**
   * Build graph links based on keyword matching
   */
  linkByKeywords(fromId: string, keywords: string[]): void {
    const allFiles = this.getAllAtomicFiles();

    for (const file of allFiles) {
      if (file.factId === fromId) continue;

      const fileContent = fs.readFileSync(file.path, 'utf-8').toLowerCase();
      const matchedKeywords = keywords.filter(k => fileContent.includes(k.toLowerCase()));

      if (matchedKeywords.length > 0) {
        this.addRelation(
          fromId,
          file.factId,
          'related',
          `Keyword match: ${matchedKeywords.join(', ')}`
        );
      }
    }
  }

  /**
   * Update atomic file with links
   */
  updateRelatedSection(factId: string): void {
    const file = this.findAtomicFileById(factId);
    if (!file) return;

    const relations = this.getRelations(factId);
    if (relations.length === 0) return;

    let content = fs.readFileSync(file, 'utf-8');

    // Remove old Related: section
    content = content.replace(/### Related:[\s\S]*?(?=###|$)/, '');

    // Add new Related: section
    let relatedSection = '\n### Related:\n';
    for (const rel of relations) {
      const relFile = this.findAtomicFileById(rel.toId);
      if (relFile) {
        const relativePath = path.relative(path.dirname(file), relFile);
        relatedSection += `* [${rel.description}](./${relativePath})\n`;
      }
    }

    content += relatedSection;
    fs.writeFileSync(file, content, 'utf-8');
  }

  /**
   * Generate relationship visualization
   */
  generateGraphVisualization(): string {
    let viz = '# Memory Graph\n\n';
    viz += 'Relationship map between facts.\n\n';

    const nodes = new Set<string>();
    for (const [from, relations] of this.relations.entries()) {
      nodes.add(from);
      for (const rel of relations) {
        nodes.add(rel.toId);
      }
    }

    viz += `## Nodes (${nodes.size})\n`;
    for (const node of Array.from(nodes).sort()) {
      const file = this.findAtomicFileById(node);
      const title = file ? this.extractTitle(file) : node;
      viz += `- ${node}: ${title}\n`;
    }

    viz += `\n## Relations (${Array.from(this.relations.values()).reduce((acc, r) => acc + r.length, 0)})\n\n`;
    for (const [from, rels] of this.relations.entries()) {
      for (const rel of rels) {
        viz += `- ${from} --[${rel.type}]--> ${rel.toId}\n`;
        viz += `  "${rel.description}"\n`;
      }
    }

    return viz;
  }

  private calculateSimilarity(factA: { content: string; title: string }, factB: { content: string; title: string }): number {
    const wordsA = new Set((factA.content + ' ' + factA.title).toLowerCase().split(/\s+/));
    const wordsB = new Set((factB.content + ' ' + factB.title).toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of wordsA) {
      if (word.length > 3 && wordsB.has(word)) {
        intersection++;
      }
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private getAllAtomicFiles(): Array<{ path: string; factId: string }> {
    const files: Array<{ path: string; factId: string }> = [];
    const subdirs = ['decisions', 'errors', 'projects', 'tools', 'people', 'ideas'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.atomicDir, subdir);
      if (!fs.existsSync(subdirPath)) continue;

      const entries = fs.readdirSync(subdirPath);
      for (const entry of entries) {
        const filePath = path.join(subdirPath, entry);
        const content = fs.readFileSync(filePath, 'utf-8');
        const idMatch = content.match(/- \*\*ID\*\*: (.+?)$/m);
        if (idMatch) {
          files.push({ path: filePath, factId: idMatch[1] });
        }
      }
    }

    return files;
  }

  private findAtomicFileById(factId: string): string | null {
    const allFiles = this.getAllAtomicFiles();
    const file = allFiles.find(f => f.factId === factId);
    return file ? file.path : null;
  }

  private extractTitle(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    const titleMatch = content.match(/^# (.+?)$/m);
    return titleMatch ? titleMatch[1] : path.basename(filePath);
  }

  private loadRelations(): void {
    const relFile = path.join(path.dirname(this.atomicDir), 'relations.json');
    if (fs.existsSync(relFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(relFile, 'utf-8'));
        for (const [fromId, rels] of Object.entries(data)) {
          this.relations.set(fromId, rels as GraphRelation[]);
        }
      } catch (e) {
        console.error('Error loading relations:', e);
      }
    }
  }

  private saveRelations(): void {
    const relFile = path.join(path.dirname(this.atomicDir), 'relations.json');
    const data: Record<string, GraphRelation[]> = {};
    for (const [fromId, rels] of this.relations.entries()) {
      data[fromId] = rels;
    }
    fs.writeFileSync(relFile, JSON.stringify(data, null, 2));
  }
}
