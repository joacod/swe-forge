# Herdr Adapter

Herdr is an optional environment-level isolation layer. It owns terminals,
panes, workspaces, agents, and Git worktree sessions; it does not replace the
coding harness or define the SWE Forge workflow.

Use this adapter only when the routing policy selects `HERDR` because separate
execution environments materially improve the run. For native subagents or
sequential work, do not introduce Herdr overhead.

## Official Skill

Herdr publishes a release-matched agent skill. When an agent is running inside
Herdr, the installed binary can print it with:

```bash
herdr --skill
```

Users may install the official skill through their preferred skill manager or
copy the release-matched source from Herdr. Do not copy vendor instructions
into the canonical SWE Forge role files. The runbook in this directory is the
SWE Forge-specific coordination layer around that official skill.

## Safety Boundary

Before issuing Herdr control commands, verify:

```bash
test "${HERDR_ENV:-}" = 1
```

If this check fails, do not inspect or control a Herdr session from outside a
managed pane. Fall back to native subagents or sequential execution and record
the fallback.

## Runbook

See [runbook.md](runbook.md) for the bounded-task, worktree, result, wait,
integration, and cleanup procedure.

## Current Surface

The runbook uses the current Herdr CLI first. The raw socket API is an advanced
option for custom tools and event subscribers. Check the installed binary's
help output before relying on a command or response shape.

References checked on 2026-08-10:

- https://herdr.dev/docs/agent-skill/
- https://herdr.dev/docs/socket-api/
- https://herdr.dev/docs/quick-start/
