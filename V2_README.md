# Session Context Extractor — V2 (Full-Featured Memory System)

**Advanced multi-layer memory system with auto-distillation, atomic storage, graph linking, and self-improvement.**

This is the production-ready version combining the best of OpenClaw's 5-layer architecture with our unique decision-reasoning focus.

---

## What's New in V2

### 1. **Auto-Distillation (Cron-Driven)**
- Daily at 21:00 (configurable timezone): processes daily memory logs
- Extracts decisions, errors, preferences, contacts automatically
- Updates MEMORY.md with "Distilled Updates" section
- Writes atomic files for each fact
- **No manual curation needed**

### 2. **Atomic Files** (memory/context-vault/atomic/)
```
decisions/     # One file per decision
errors/        # One file per error with full history
projects/      # (future) Project context
tools/         # (future) Tool configurations
people/        # (future) Contact/relationship files
ideas/         # Preferences, backlog items
summaries/     # Weekly reviews, patterns
```

Each file includes:
- **Meta**: ID, type, dates, status
- **Content**: Full details with formatting
- **Related**: Links to connected facts (graph)
- **Keywords**: Expanded with synonyms + FR/EN variants

### 3. **Graph Linking**
- Automatically detects relationships between facts
- Links by keyword matching, content similarity
- Visualization of entire memory network
- Navigable "Related:" sections in each atomic file

### 4. **Keyword Expansion** (Medium-Level)
- Primary terms + synonyms + French/English variants
- Abbreviations and technical term mapping
- Stem generation for flexible matching
- Search with `npm run v2:query "your question"`

### 5. **Self-Improvement Loop**
- `.learnings/LEARNINGS.md` — corrections & insights
- `.learnings/ERRORS.md` — command failures
- `.learnings/FEATURE_REQUESTS.md` — missing capabilities
- Cron auto-detects patterns and promotes important entries
- Self-review reports show system health

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  LAYER 1: CAPTURE                          │
│  memory/dailies/YYYY-MM-DD.md              │
│  (raw session logs — never filtered)       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  LAYER 2: DISTILLATION (cron 21h)          │
│  Extract: Decision, Error, Preference      │
│  Dedup + Filter + Reformulate              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  LAYER 3: ATOMIC STORAGE                   │
│  context-vault/atomic/{type}/*.md          │
│  One fact = one file = one source of truth │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  LAYER 4: GRAPH LINKING                    │
│  Auto-detect relations by keyword          │
│  Update "Related:" sections                │
│  Build visualization                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  LAYER 5: RETRIEVAL + KEYWORDS             │
│  Query with expansion (synonyms, variants) │
│  Hybrid: exact match + partial + stems     │
│  Return ranked results with context        │
└─────────────────────────────────────────────┘
```

---

## Installation

```bash
cd ~/.openclaw/workspace/skills/session-context-extractor
npm install
mkdir -p memory/dailies
mkdir -p .learnings
```

---

## Usage

### Start the Cron System

```bash
npm run v2:start
```

This runs 24/7, distilling at 21:00 each day in your configured timezone.

### Run Distillation Immediately (Testing)

```bash
npm run v2:distill
```

Processes all dailies since last distillation, updates atomic files.

### Query the Vault

```bash
npm run v2:query "What did we decide about OCI?"
```

Returns:
- Matching facts (ranked by relevance)
- Related facts (graph links)
- Keywords that matched
- Verification status

### List Facts

```bash
# List recent facts (last 7 days)
npm run v2:list

# List all decisions
npm run v2:list decision

# List all errors
npm run v2:list error
```

### Self-Review Report

```bash
npm run v2 self-review
```

Shows:
- Pending learnings
- Detected patterns
- Recent errors
- Actionable improvements

### Show Memory Graph

```bash
npm run v2 graph
```

Visualizes all relationships between facts.

### Show Atomic Index

```bash
npm run v2 index
```

Lists all atomic files organized by category.

### Set Timezone

```bash
npm run v2 set-timezone America/Los_Angeles
npm run v2 set-timezone Europe/Paris
npm run v2 set-timezone America/Chicago  # default
```

---

## Daily Logs Format

Write to `memory/dailies/YYYY-MM-DD.md`:

```markdown
## [HH:MM] — Decision Context

* Decision: Chose OCI Foundations cert as priority
* Information: Delta Utilities uses OCI in production
* Insight: Job alignment makes learning faster

## [HH:MM] — Error Context

* Error: Proxmox emergency mode — /dev/mapper/pve-root corruption
* Information: fsck repair failed, system stuck in emergency
* Decision: Plan full reinstall over existing disk

## [HH:MM] — Preference Context

* Preference: I dislike manual Splunk dashboard management
* Information: Dashboard updates are tedious and error-prone
```

The cron job reads these every day and extracts to atomic files.

---

## Atomic File Structure

Each file in `context-vault/atomic/{type}/` looks like:

```markdown
# Prioritize OCI Foundations over AZ-104

> Atomic entity — one decision per file.

## Meta
- **ID**: decision_20260426_abc123
- **Type**: decision
- **Created**: 2026-04-26
- **Updated**: 2026-04-26
- **System**: certifications
- **Status**: Verified

## Content
Decision made to prioritize Oracle Cloud Infrastructure Foundations (1Z0-1085) over Azure AZ-104.

## Decision Details
**Choice**: OCI Foundations as priority
**Reasoning**: Delta uses OCI, AZ-900 complete, aligns with job
**Constraints**: Limited study time, full-time work
**Rejected**: Parallel study (too much cognitive load)
**Revisit**: After OCI passes, reassess based on Azure adoption

### Related:
* [Referenced by error about Proxmox](../errors/2026-04-24-proxmox-fs.md)
* [Similar decision about cert priorities](./2026-04-15-cert-strategy.md)

### Keywords:
decision, choice, oci, azure, certification, delta utilities, exam, priority, cert, learning, goal
```

---

## Self-Improvement System

### .learnings/ Files

**LEARNINGS.md** — Corrections and insights:
```markdown
## [LRN-20260426-ABC] insight

**Logged**: 2026-04-26T14:35:00Z
**Priority**: high
**Status**: pending
**Area**: memory

### Summary
User prefers decision reasoning preserved with every decision

### Details
[Full context about the insight]

### Suggested Action
Ensure all decisions capture: choice, reasoning, constraints, revisit trigger
```

**ERRORS.md** — Failures:
```markdown
## [ERR-20260426-XYZ] distillation

**Logged**: 2026-04-26T21:00:00Z
**Priority**: high
**Status**: pending
**Area**: cron

### Summary
Distillation failed on 2026-04-26

### Error
[Error message]

### Suggested Fix
Check dailies directory structure
```

**FEATURE_REQUESTS.md** — Missing capabilities:
```markdown
## [FEAT-20260426-DEF] auto-graph-linking

**Logged**: 2026-04-26T10:00:00Z
**Priority**: medium
**Status**: pending
**Area**: retrieval

### Requested Capability
Automatically detect relationships between facts without manual linking

### User Context
Would improve navigation without manual curation
```

### Cron Self-Review

Daily at 21:00:
1. Reads pending entries in `.learnings/`
2. Detects recurring patterns (>2 occurrences)
3. If patterns found → promotes to MEMORY.md or atomic files
4. Generates self-review.md with observations

---

## Comparison: V1 vs V2

| Feature | V1 | V2 |
|---------|----|----|
| Manual extraction | ✓ | ✓ (+ auto-distill) |
| SQLite vault | ✓ | ✓ |
| Query engine | ✓ | ✓ (+ expansion) |
| Atomic files | ✗ | ✓ |
| Graph linking | ✗ | ✓ |
| Cron automation | ✗ | ✓ |
| Self-improvement | ✗ | ✓ |
| Keyword expansion | ✗ | ✓ |
| MEMORY.md updates | ✗ | ✓ |

---

## Portability

**Timezone Flexibility**:
```bash
npm run v2 set-timezone America/New_York      # 21:00 EST
npm run v2 set-timezone Europe/London         # 21:00 GMT
npm run v2 set-timezone Asia/Tokyo            # 21:00 JST
```

**Node.js requirement**: Node 18+

**No external APIs**: Everything is local

---

## Troubleshooting

### Cron not running?
```bash
npm run v2:distill  # Test manually
# If this works, cron setup is fine
```

### Dailies not being processed?
Check `memory/dailies/` exists with YYYY-MM-DD.md files

### Keywords not matching?
Try `npm run v2:query` with simpler terms

### Graph links not updating?
Run `npm run v2:distill` to force graph rebuild

---

## Next Steps (Post-Contest)

Future enhancements:
- Full FR/EN keyword matrix (currently medium-level)
- ML-based relationship detection
- Semantic similarity (embeddings)
- BM25 hybrid search
- User-defined expansion maps

---

## License

MIT

---

Built for Heyron Agent Jam #1 — May 2026
