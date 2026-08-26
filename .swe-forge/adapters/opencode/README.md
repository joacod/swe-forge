# OpenCode Adapter

OpenCode is a Compatible adapter exposing SWE Forge through user-level
commands. Canonical files remain `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/`; this adapter only translates host syntax and permissions.

## Commands

The installer links `commands/swe-forge.md` to
`~/.config/opencode/commands/`. `$ARGUMENTS` and file references load the
canonical support tree only when the user types `/swe-forge`. The shared
invocation parser runs once; ordinary prompts do not activate Forge.

Delivery actions remain separate:

```text
/git-commit [paths|message]
/git-push [force|-f]
/git-pr [draft]
/git-sync
```

Each delivery command loads `policies/delivery.md`; `/git-pr draft` is an
explicit draft request and plain `/git-pr` remains normal/open.

## Native subagents

When routing selects `SUBAGENTS`, render and validate the canonical worker brief
with `../../tools/swe-forge-worker-brief` and pass it unchanged with the role
and result/review contract. Writable workers in one delivery checkout run
sequentially; the root owns materialization, integration, and delivery.

A custom `.opencode/agents/` entry should be a thin host bridge, for example:

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

Keep runtime and permission choices in OpenCode configuration. Read-only roles
must not receive edit access; writable scope comes from the task contract.

## References

The adapter follows OpenCode's command, agent, skill, and permission
conventions. See [shared adapter behavior](../README.md) and:

- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/rules/
