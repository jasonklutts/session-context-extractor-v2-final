# Session Context Extractor

**Auto-capture decision reasoning, error history, preferences, and relationships from agent sessions.**

This skill solves a critical problem: agents lose cross-session context. You make decisions, hit errors, mention preferences — and when the session restarts, that context is gone. MEMORY.md helps, but it requires manual curation and doesn't preserve *why* decisions were made.

**Session Context Extractor** automatically captures and indexes this context so your agent can answer:

- "What did we decide about OCI vs Azure?" → Full reasoning + constraints + revisit conditions
- "What errors have we hit with Proxmox?" → Specific error messages + what was tried + what worked
- "What are Jason's preferences?" → Verified preferences + strength + context
- "Who did we talk to about the homelab?" → Names + relationships + what was discussed

---

## What It Does

### Captures
- **Decisions**: choice made, reasoning, alternatives rejected, constraints, when to revisit
- **Errors**: specific error messages, systems affected, attempts made, resolutions, lessons
- **Preferences**: casually mentioned preferences (verified before acting on them)
- **Contacts**: people mentioned, relationships, context of conversations

### Stores
- Structured vault in `memory/context-vault/` (both queryable SQLite + human-readable markdown)
- Timestamps on everything (when was this learned?)
- Verification status (are we sure about this preference?)
- Relationships between facts (error → related decision → lessons learned)

### Enables
- Natural language queries: "What did we decide...?"
- Structured searches: by date, system, type, verified status
- Stale decision detection: "This was decided 6 months ago, still valid?"
- Preference verification: confirm before acting on casual mentions

---

## Installation in Heyron Container

### 1. Clone the Skill

In your Heyron container:

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/jasonklutts/session-context-extractor.git
cd session-context-extractor
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `better-sqlite3` — embedded SQLite database
- `lunr` — full-text search
- `typescript` & `ts-node` — for running TypeScript directly

All dependencies are pure Node.js; no system packages or Python required.

### 3. Verify Installation

```bash
npm run list
```

This should show: `Found 0 facts` (vault is empty, which is expected).

---

## Usage

### Option A: Tell Your Agent to Use It

The simplest way. Just tell your agent:

```
"Use the session-context-extractor skill to capture that decision about OCI."
```

Your agent will extract the context and store it automatically.

---

### Option B: Manual Extraction (Advanced)

If you want to feed raw session content:

Create a file at `session-input.md` with your conversation and then the agent can process it via the skill.

---

### Query the Vault

Once facts are stored, query them:

```bash
# Natural language search
npm run query "What did we decide about OCI?"

# List all decisions
npm run list decision

# List all errors
npm run list error

# Show unverified preferences (need confirmation)
npm run unverified

# Show stale decisions (older than 90 days)
npm run stale

# Export recent facts
npm run export json > facts.json
```

---

## Architecture

### File Structure

```
memory/context-vault/
  ├── vault.db                    # SQLite database (queryable index)
  ├── decision/                   # Individual decision markdown files
  │   ├── 2026-04-26-oci-vs-azure.md
  │   └── 2026-04-20-cert-priorities.md
  ├── error/                      # Error logs
  │   ├── 2026-04-24-proxmox-fs-corruption.md
  │   └── 2026-04-18-splunk-timeout.md
  ├── preference/                 # Verified preferences
  │   ├── 2026-04-20-logging-tools.md
  │   └── 2026-04-15-vm-management.md
  ├── contact/                    # People and relationships
  │   └── 2026-04-15-delta-utilities.md
  └── INDEX.md                    # Human-readable summary
```

### Tech Stack

**Database**: SQLite with `better-sqlite3`
- Embedded, no server, no external dependencies
- Full-text search with FTS5
- Audit logging and relationship tracking

**Search**: Lunr.js
- Pure JavaScript, works offline
- BM25 ranking, boolean queries, field search

**Language**: TypeScript on Node.js
- Type safety, readable code
- Works with Node 22+
- No compilation needed at runtime

---

## How Extraction Works

### Decisions

The skill extracts:
- **Choice Made**: What was chosen
- **Reasoning**: Why that choice
- **Constraints**: What mattered (time, budget, existing systems)
- **Rejected**: What alternatives were ruled out
- **Revisit Trigger**: When to reconsider this decision

Example:
```markdown
Title: Prioritize OCI Foundations over AZ-104
Choice: OCI Foundations (1Z0-1085) is priority
Reasoning: Delta uses OCI, AZ-900 complete, aligns with new job
Constraints: Full-time work, limited study hours
Rejected: Parallel study (too cognitively demanding)
Revisit: After OCI is passed, reassess AZ-104 based on Delta's Azure plans
```

### Errors

The skill captures:
- **Component Affected**: What system/service
- **Error Messages**: Exact output (searchable)
- **Attempts Made**: What was tried and the outcome
- **Resolution**: How it was fixed
- **Lessons**: What to do differently next time

### Preferences

The skill notes:
- **Topic**: What the preference is about
- **Preference**: The actual preference
- **Strength**: Casual vs. moderate vs. strong
- **Verification**: Unverified until you confirm

---

## Demo: Before vs After

### Before (Without the Skill)

```
Jason: "What did we decide about OCI vs Azure?"
Jarvis: "I know OCI is the priority but I don't remember the reasoning..."
```

No context. Requires re-explanation every session.

### After (With the Skill)

```
Jason: "What did we decide about OCI vs Azure?"
Jarvis: "Decision from April 26: OCI Foundations is the priority cert.

Reasoning: Delta uses OCI, you've passed AZ-900, it aligns with your role.
Constraints: Limited study time while working full-time.
Alternatives rejected: Parallel study (too cognitively demanding).
Revisit trigger: After OCI is passed, reassess based on Delta's Azure plans."
```

Full context, reasoning, and decision criteria — instantly, without re-explaining.

---

## Storage & Privacy

- **All data is local**: Everything stays in `~/.openclaw/workspace/context-vault/`
- **No cloud sync**: SQLite is self-contained, no external services required
- **No API keys needed**: Uses your agent's own LLM context
- **You control what's stored**: Preferences are unverified by default
- **Human-readable**: All facts are stored as markdown files you can inspect and edit

---

## Integration with MEMORY.md

The vault is **separate from but complementary to MEMORY.md**:

| Aspect | Context Vault | MEMORY.md |
|--------|-------|----------|
| Format | Structured, queryable | Prose narrative |
| Updated | Automatically after each session | Weekly hygiene |
| Purpose | Indexed reference | Executive summary |
| Search | Fast, structured | Manual reading |

**Workflow**:
1. Extraction happens immediately (vault stores facts)
2. Weekly, your agent synthesizes vault entries into MEMORY.md
3. Both stay in sync: vault is the index, MEMORY.md is the summary

---

## Troubleshooting

### "vault.db not found"

The vault directory doesn't exist. Your agent will create it automatically on first use, or run:

```bash
mkdir -p ~/.openclaw/workspace/context-vault
```

### "Query returns no results"

- Check if facts are stored: `npm run list`
- Try broader search terms
- Ensure your agent has actually extracted facts yet

### "Permission denied"

Ensure `~/.openclaw/workspace/` is writable by your agent process.

---

## License

MIT License. Feel free to fork, extend, and build on this.

---

## Built For

Heyron Agent Jam #1 — May 2026

See SKILL.md for detailed agent integration instructions.
