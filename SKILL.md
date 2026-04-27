---
name: session-context-extractor
description: Auto-capture decision reasoning, error history, preferences, and relationships from agent sessions. Stores them in a queryable vault so you remember *why* things happened, not just *what* happened. Use when you want to preserve cross-session context: decisions you made, errors you've encountered, your preferences, and people you've discussed things with.
---

# Session Context Extractor

## What This Skill Does

After each session, this skill extracts and stores:

- **Decisions** — what you chose, why, what you rejected, when to reconsider
- **Errors** — specific error messages, what you tried, what worked or failed
- **Preferences** — casual mentions like "I hate that tool" or "I prefer this approach"
- **Contacts** — who you've talked to and what you discussed

These get stored in a queryable vault (`memory/context-vault/`) so you can answer questions like:

- "What did we decide about OCI vs Azure?"
- "What errors have we hit with Proxmox?"
- "What does Jason prefer for logging tools?"
- "What was the last thing we tried for [system]?"

## When to Use This Skill

Use this skill when:
- You make a significant decision and want the reasoning preserved
- You hit an error and want the specific error messages + attempts logged
- You mention a preference (even casually) and want it remembered
- You want to query what you've learned about a system or topic across multiple sessions

## How It Works

### Automatic Extraction

When you tell me "Use the session-context-extractor skill," I will:

1. **Identify decisions made this session** — what was chosen, alternatives considered, reasoning
2. **Extract errors and troubleshooting** — specific error messages, attempts made, resolution
3. **Capture preferences** — things you mentioned liking/disliking
4. **Track contacts** — people mentioned and context

### The Vault Structure

Your facts are stored at `memory/context-vault/` as:

```
memory/context-vault/
  vault.db                     # SQLite index (queryable, machine-readable)
  decision/                    # Individual decision files
    2026-04-26-oci-vs-azure.md
  error/                       # Error history by incident
    2026-04-26-proxmox-fs-corruption.md
  preference/                  # Your stated preferences
    2026-04-20-logging-tool-preference.md
  contact/                     # People and discussions
    2026-04-15-delta-utilities-conversation.md
  INDEX.md                     # Human-readable summary
```

### How to Query

Ask me questions like:

- `"What did we decide about OCI?"`
- `"Show me all errors with Proxmox"`
- `"What are Jason's preferences?"`
- `"Who have we talked to about the homelab?"`

I'll search the vault and give you exact reasoning + timestamps + context.

### Preferences & Verification

For casual preferences (e.g., "I hate Splunk's UI"), I'll capture them as **unverified** and ask later:

> "You mentioned disliking Splunk's UI — want me to log that as a preference?"

This prevents me from over-inferring. You stay in control.

### Stale Decisions

Decisions older than 90 days get flagged as potentially stale. I'll note when something was decided and whether it might need revisiting.

## Instructions for Using This Skill

### During a Session (How I Should Handle This)

If you make a decision:

```
You: "I think we should focus on OCI certs first, not Azure."
Me: [extract and confirm] "Got it — decision captured: priority OCI over Azure (deadline pressure + Delta uses OCI). Should I also note when this should be revisited?"
You: "Yeah, revisit if Delta switches to Azure."
Me: [store with revisit trigger]
```

If you hit an error:

```
You: "Proxmox dropped into emergency mode again."
Me: [extract details from your description] "Error captured: emergency mode at boot. Details stored: /dev/mapper/pve-root fsck failed, attempted recovery mode — unsuccessful. Reinstall planned as resolution."
```

If you mention a preference:

```
You: "I really hate managing Splunk dashboards manually."
Me: [flag for verification] "Noted — potential preference: dislike of manual Splunk dashboard management. Confirm?"
You: "Yeah, remember that."
Me: [marks as verified]
```

### Querying the Vault

Later, you can ask me:

```
You: "What did we decide about the Proxmox rebuild?"
Me: [searches vault, returns from decision + error logs] "Decision from April 26: reinstall Proxmox over the existing disk to preserve pve-data storage. Reason: filesystem corruption from repeated ungraceful shutdowns. Previous attempts (fsck journal repair) left the system in emergency mode. Revisit trigger: after 32GB RAM upgrade is complete."
```

### Manual Updates

You can also ask me to update the vault directly:

- `"Mark preference about Splunk as verified"`
- `"Add a lesson learned from the Proxmox rebuild: take VM snapshots before major changes"`
- `"Update the OCI decision: revisit in Q3 2026"`

## Examples

### Decision Extraction Example

**Input:** You tell me you've decided to prioritize OCI Foundations Associate cert over AZ-104.

**What Gets Stored:**

```
Title: Prioritize OCI Foundations Associate over AZ-104
Type: Decision
Date: 2026-04-26
Status: Verified

Choice: OCI Foundations (1Z0-1085) is now priority cert
Reasoning: Delta Utilities uses OCI. AZ-900 already passed. OCI focus aligns with new job.
Constraints: Limited study time, working full-time
Rejected: Parallel study (too much cognitive load)
Revisit Trigger: After OCI is passed, reassess AZ-104 timing
```

### Error Extraction Example

**Input:** You describe the Proxmox filesystem corruption incident.

**What Gets Stored:**

```
Title: Proxmox Filesystem Corruption — Emergency Mode
Type: Error
Date: 2026-04-24
System: Proxmox (Dell OptiPlex 7070)
Status: Unverified (waiting for more details)

Affected Component: /dev/mapper/pve-root
Error Messages:
  - Filesystem corruption detected at boot
  - fsck journal repair failed
  - Dropped to emergency mode, boot stalled

Attempts:
  1. fsck /dev/mapper/pve-root — FAILURE (journal repair incomplete)
  2. Boot recovery mode — FAILURE (emergency mode persisted)

Resolution: Planned Proxmox reinstall over existing disk to preserve pve-data storage

Lessons:
  - Take VM snapshots (202/203/204) before major changes
  - Track repeated ungraceful shutdowns as early warning
  - Have recovery steps documented in advance
```

### Preference Extraction Example

**Input:** You casually mention "I hate dealing with Splunk's UI."

**What Gets Stored (unverified):**

```
Title: Tool Preference — Splunk UI
Type: Preference
Date: 2026-04-26
Topic: Logging tools
Preference: Dislike of Splunk's UI (prefer simpler alternatives)
Strength: Strong
Context: Mentioned in context of dashboard management frustration
Status: Unverified — awaiting confirmation
```

Later: `You: "Yeah, remember that." Me: [marks as verified, can now act on it]`

## Common Patterns I Should Use

### Confirm High-Stakes Preferences

If you mention something casually that sounds important, I confirm before storing:

```
You: "I'd really prefer not to SSH into that server."
Me: "Noted — should I mark 'avoid SSH to [server]' as a standing preference?"
```

### Prompt for Revisit Triggers

For decisions, I'll ask:

```
Me: "When should we revisit this decision? (e.g., 'in 6 months', 'if X changes', 'after Y is complete')"
```

### Group Related Facts

If you hit an error that's related to a previous decision, I'll note the connection:

```
Error (current): Proxmox filesystem corruption
Related Decision: Decided to postpone VM snapshots until after April work
Connection: Snapshots would have prevented this incident
```

## Limitations

- I can't extract facts from before this skill is enabled. Existing MEMORY.md stays as-is; vault captures new context going forward.
- Preferences need explicit confirmation before I'll act on them. I won't infer strong opinions.
- Errors need you to describe what happened; I'll parse your descriptions but won't auto-collect system logs (yet).

## Querying the Vault (For Advanced Users)

If you want to query directly, the vault is at `memory/context-vault/`:

```bash
# List recent facts
npm run list

# Search for decisions about OCI
npm run query "OCI decisions"

# Show unverified preferences
npm run unverified

# Export to JSON
npm run export json
```

See README.md for full command reference.

## Integration with MEMORY.md

The vault is **separate from MEMORY.md**, but complementary:

- **Vault** = machine-readable, queryable, auto-populated, structured by type
- **MEMORY.md** = human-readable narrative, manually curated, executive summary

During weekly hygiene, I'll synthesize important vault entries into MEMORY.md sections so both stay in sync.

## What This Replaces

This skill doesn't replace MEMORY.md. It enhances it by:
- Capturing context that usually gets lost
- Making facts queryable instead of requiring manual reading
- Tracking *why* decisions were made, not just *what*
- Flagging stale decisions
- Preserving error history for troubleshooting

Think of it as MEMORY.md + an index + a reasoning layer.
