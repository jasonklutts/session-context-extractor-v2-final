import fs from 'fs';
import path from 'path';
import { Fact, Decision, ErrorEvent, Preference, Contact, FactType } from './types';

export interface AtomicMetadata {
  created: string;
  updated: string;
  category: string;
  relatedFiles: string[];
  keywords: string[];
}

export class AtomicFileManager {
  private atomicDir: string;

  constructor(workspacePath: string) {
    this.atomicDir = path.join(workspacePath, 'context-vault', 'atomic');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = ['decisions', 'errors', 'projects', 'tools', 'people', 'ideas', 'summaries'];
    for (const dir of dirs) {
      const dirPath = path.join(this.atomicDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  /**
   * Write a fact as an atomic file
   */
  writeAtomicFact(fact: Fact, metadata?: Partial<AtomicMetadata>): string {
    const subdir = this.getSubdirectory(fact.type);
    const filename = this.generateFilename(fact);
    const filepath = path.join(this.atomicDir, subdir, filename);

    const content = this.factToAtomicMarkdown(fact, metadata);
    fs.writeFileSync(filepath, content, 'utf-8');

    return filepath;
  }

  /**
   * Update an atomic file with new information
   */
  updateAtomicFact(fact: Fact, metadata?: Partial<AtomicMetadata>): void {
    const filepath = this.findAtomicFile(fact.id);
    if (!filepath) {
      // Create new if doesn't exist
      this.writeAtomicFact(fact, metadata);
      return;
    }

    const content = this.factToAtomicMarkdown(fact, metadata);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  /**
   * Link related facts in atomic files
   */
  addRelation(fromFactId: string, toFactPath: string, description: string): void {
    const filepath = this.findAtomicFile(fromFactId);
    if (!filepath) return;

    const content = fs.readFileSync(filepath, 'utf-8');
    
    // Find or create Related: section
    let updated = content;
    if (!content.includes('### Related:')) {
      updated += '\n### Related:\n';
    }

    // Add relation if not already there
    const relationLine = `* [${description}](${toFactPath})`;
    if (!updated.includes(relationLine)) {
      const parts = updated.split('### Related:');
      updated = parts[0] + '### Related:\n' + relationLine + '\n' + parts[1];
    }

    fs.writeFileSync(filepath, updated, 'utf-8');
  }

  /**
   * Get all atomic files for a system/category
   */
  getAtomicFilesForSystem(system: string): string[] {
    const files: string[] = [];

    for (const subdir of ['decisions', 'errors', 'projects', 'tools', 'people']) {
      const subdirPath = path.join(this.atomicDir, subdir);
      if (!fs.existsSync(subdirPath)) continue;

      const entries = fs.readdirSync(subdirPath);
      for (const entry of entries) {
        const filepath = path.join(subdirPath, entry);
        const content = fs.readFileSync(filepath, 'utf-8');
        
        // Check if file mentions the system
        if (content.includes(`System: ${system}`) || content.toLowerCase().includes(system.toLowerCase())) {
          files.push(filepath);
        }
      }
    }

    return files;
  }

  /**
   * Generate index of all atomic files
   */
  generateIndex(): string {
    let index = '# Atomic Memory Index\n\n';
    index += `Generated: ${new Date().toISOString()}\n\n`;

    const subdirs = ['decisions', 'errors', 'projects', 'tools', 'people', 'ideas', 'summaries'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.atomicDir, subdir);
      if (!fs.existsSync(subdirPath)) continue;

      const entries = fs.readdirSync(subdirPath);
      if (entries.length === 0) continue;

      index += `## ${this.capitalize(subdir)} (${entries.length})\n\n`;

      for (const entry of entries) {
        const filepath = path.join(subdirPath, entry);
        const content = fs.readFileSync(filepath, 'utf-8');
        
        // Extract title
        const titleMatch = content.match(/^# (.+?)$/m);
        const title = titleMatch ? titleMatch[1] : entry;

        // Extract date if available
        const dateMatch = content.match(/\*\*Date\*\*: (.+?)$/m);
        const date = dateMatch ? dateMatch[1] : 'unknown';

        index += `- **${title}** (${date})\n`;
        index += `  Path: \`${subdir}/${entry}\`\n`;
      }

      index += '\n';
    }

    return index;
  }

  private getSubdirectory(type: FactType): string {
    const typeMap: Record<FactType, string> = {
      'decision': 'decisions',
      'error': 'errors',
      'preference': 'ideas',
      'contact': 'people',
      'information': 'info',
    };
    return typeMap[type] || 'ideas';
  }

  private generateFilename(fact: Fact): string {
    const date = new Date(fact.timestamp).toISOString().split('T')[0];
    const title = fact.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);
    return `${date}-${title}.md`;
  }

  private findAtomicFile(factId: string): string | null {
    const subdirs = ['decisions', 'errors', 'projects', 'tools', 'people', 'ideas', 'summaries'];

    for (const subdir of subdirs) {
      const subdirPath = path.join(this.atomicDir, subdir);
      if (!fs.existsSync(subdirPath)) continue;

      const entries = fs.readdirSync(subdirPath);
      for (const entry of entries) {
        const filepath = path.join(subdirPath, entry);
        const content = fs.readFileSync(filepath, 'utf-8');
        if (content.includes(`ID: ${factId}`) || content.includes(factId)) {
          return filepath;
        }
      }
    }

    return null;
  }

  private factToAtomicMarkdown(fact: Fact, metadata?: Partial<AtomicMetadata>): string {
    let content = `# ${fact.title}\n\n`;
    content += `> Atomic entity — one ${fact.type} per file.\n\n`;

    content += `## Meta\n`;
    content += `- **ID**: ${fact.id}\n`;
    content += `- **Type**: ${fact.type}\n`;
    content += `- **Created**: ${metadata?.created || new Date(fact.timestamp).toISOString().split('T')[0]}\n`;
    content += `- **Updated**: ${metadata?.updated || new Date().toISOString().split('T')[0]}\n`;
    if (fact.system) {
      content += `- **System**: ${fact.system}\n`;
    }
    content += `- **Status**: ${fact.verified ? 'Verified' : 'Unverified'}\n\n`;

    content += `## Content\n${fact.content}\n\n`;

    // Type-specific sections
    if (fact.type === 'decision') {
      const dec = fact as Decision;
      if (dec.details.choice) {
        content += `## Decision Details\n`;
        content += `**Choice**: ${dec.details.choice}\n\n`;
      }
      if (dec.details.reasoning) {
        content += `**Reasoning**: ${dec.details.reasoning}\n\n`;
      }
      if (dec.details.constraints && dec.details.constraints.length > 0) {
        content += `**Constraints**:\n`;
        for (const c of dec.details.constraints) {
          content += `- ${c}\n`;
        }
        content += `\n`;
      }
      if (dec.details.rejected && dec.details.rejected.length > 0) {
        content += `**Rejected**: ${dec.details.rejected.join(', ')}\n\n`;
      }
      if (dec.details.revisitTrigger) {
        content += `**Revisit**: ${dec.details.revisitTrigger}\n\n`;
      }
    } else if (fact.type === 'error') {
      const err = fact as ErrorEvent;
      if (err.details.affectedComponent) {
        content += `## Error Details\n`;
        content += `**Component**: ${err.details.affectedComponent}\n\n`;
      }
      if (err.details.errorMessages && err.details.errorMessages.length > 0) {
        content += `**Errors**:\n\`\`\`\n${err.details.errorMessages.join('\n')}\n\`\`\`\n\n`;
      }
      if (err.details.resolution) {
        content += `**Resolution**: ${err.details.resolution}\n\n`;
      }
    }

    content += `### Related:\n`;
    content += `${metadata?.relatedFiles?.map(f => `* ${f}`).join('\n') || '* (none yet)\n'}\n\n`;

    content += `### Keywords:\n`;
    const keywords = metadata?.keywords || this.generateKeywords(fact);
    content += `${keywords.join(', ')}\n`;

    return content;
  }

  private generateKeywords(fact: Fact): string[] {
    const keywords = new Set<string>();

    // Add type as keyword
    keywords.add(fact.type);

    // Add system if present
    if (fact.system) {
      keywords.add(fact.system.toLowerCase());
    }

    // Extract words from title
    const words = fact.title.toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 3) keywords.add(w);
    });

    // Add synonyms for common terms
    const synonyms: Record<string, string[]> = {
      'decision': ['choice', 'decided', 'choose'],
      'error': ['failed', 'failure', 'bug', 'broken'],
      'preference': ['prefer', 'like', 'dislike', 'want'],
      'proxmox': ['hypervisor', 'vm', 'virtualization'],
      'splunk': ['logging', 'siem', 'search'],
      'azure': ['cloud', 'microsoft', 'platform'],
      'oci': ['oracle', 'cloud', 'platform'],
    };

    for (const [term, syns] of Object.entries(synonyms)) {
      if (fact.content.toLowerCase().includes(term)) {
        syns.forEach(s => keywords.add(s));
      }
    }

    return Array.from(keywords);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
