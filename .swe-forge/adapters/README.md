# Harness Adapters

Adapters project the canonical SWE Forge workflow onto host prompts, commands,
skills, tools, profiles, and lifecycle hooks. They are optional, asymmetric
integration layers—not alternate workflow definitions.

## Canonical sources

Update these first:

- [`AGENTS.md`](../../AGENTS.md) and [`SWE-FORGE.md`](../../SWE-FORGE.md);
- [`workflows/`](../workflows/), [`agents/`](../agents/),
  [`contracts/`](../contracts/), and [`policies/`](../policies/).

Adapter files contain only host syntax, paths, permissions, capability evidence,
and translation without a canonical equivalent. Installation mappings belong to
[`registry.tsv`](registry.tsv). Adapters point to owners instead of copying
procedure.

Key references:

- [`SWE-FORGE.md`](../../SWE-FORGE.md): activation, invariants, delivery,
  Acceptance Gate, and report;
- [`workflows/ticket.md`](../workflows/ticket.md): procedure and load order;
- [`contracts/worker-brief.md`](../contracts/worker-brief.md): worker brief;
- [`policies/delegation.md`](../policies/delegation.md): worker boundaries;
- [`policies/verification.md`](../policies/verification.md): quality evidence;
- [`policies/evidence.md`](../policies/evidence.md): candidate evidence; and
- [`policies/delivery.md`](../policies/delivery.md): authorization.

Adapters pass validated review focus and worker briefs unchanged. Forge owns
scope, mutation, candidate, and acceptance; the host owns physical execution
and scheduling. Private worktrees, sandboxes, overlays, and containers are host
details, not Forge state. Materialize writable changes in the canonical checkout
and validate them before acceptance.

## Installation boundary

Use the user-level link installer, one harness per invocation:

```text
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
```

Leave project configuration alone. Review conflicts before installation. The
registry is not installed.

## Adapters

- [Pi](pi/README.md): first-class prompt/runtime bridge;
- [OpenCode](opencode/README.md): compatible command/agent bridge;
- [OMP](omp/README.md): experimental prompt/runtime bridge;
- [Claude Code](claude-code/README.md): experimental skill projection; and
- [Shared Agent Skill](shared/agent-skill/README.md): experimental Codex/Cursor
  projection.
