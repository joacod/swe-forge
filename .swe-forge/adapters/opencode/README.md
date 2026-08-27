# OpenCode Adapter

OpenCode is a Compatible adapter exposing SWE Forge through user-level
commands. It translates host syntax and permissions; canonical files remain
`AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/`.

## Commands

The installer links `commands/swe-forge.md` to
`~/.config/opencode/commands/`. `$ARGUMENTS` and file references load the
support tree only for explicit `/swe-forge`; the shared parser runs once.

Delivery actions stay separate:

```text
/git-commit [paths|message]
/git-push [force|-f]
/git-pr [draft]
/git-sync
```

Each loads `policies/delivery.md`. `/git-pr draft` is explicit; plain `/git-pr`
remains normal/open.

## Native subagents

When routing selects `SUBAGENTS`, validate and pass one unchanged canonical JSON
brief with its role and result/review contract:

```text
../../tools/swe-forge-worker-brief validate --brief FILE
```

Writable workers in one checkout are sequential; the root owns materialization,
integration, and delivery. A custom `.opencode/agents/` entry should be a thin
bridge, for example:

```markdown
---
description: Read-only SWE Forge review
mode: subagent
permission:
  edit: deny
  bash: deny
---

Read `.swe-forge/agents/reviewer.md` and return findings using
`.swe-forge/contracts/review.md`.
```

Keep runtime and permissions in OpenCode configuration. Read-only roles receive
no edit access; writable scope comes from the task contract.

References: [shared adapter behavior](../README.md),
[agents](https://opencode.ai/docs/agents/),
[commands](https://opencode.ai/docs/commands/),
[skills](https://opencode.ai/docs/skills/), and
[rules](https://opencode.ai/docs/rules/).
