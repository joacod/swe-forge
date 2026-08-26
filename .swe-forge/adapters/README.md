# Harness Adapters

Adapters expose the canonical SWE Forge workflow through host-native prompts,
commands, skills, tools, profiles, and lifecycle hooks. They are optional,
asymmetric integration layers—not alternate workflow definitions.

## Canonical sources

Update these first:

- [`AGENTS.md`](../../AGENTS.md) and [`SWE-FORGE.md`](../../SWE-FORGE.md);
- [`workflows/`](../workflows/), [`agents/`](../agents/),
  [`contracts/`](../contracts/), and [`policies/`](../policies/).

Adapter files may contain only host syntax, paths, permissions, capability
observation, and translation that has no canonical equivalent. They point back
to owners instead of copying their procedure. The registry
[`registry.tsv`](registry.tsv) owns installation mappings.

Shared references:

- [`SWE-FORGE.md`](../../SWE-FORGE.md): activation, lifecycle, topology,
  delivery, acceptance, and load map;
- [`workflows/ticket.md`](../workflows/ticket.md): procedure;
- [`tools/swe-forge-invocation`](../tools/swe-forge-invocation): parser;
- [`contracts/worker-brief.md`](../contracts/worker-brief.md): worker projection;
- [`policies/delegation.md`](../policies/delegation.md): worker boundaries;
- [`policies/verification.md`](../policies/verification.md): quality gates;
- [`policies/evidence.md`](../policies/evidence.md): candidate evidence; and
- [`policies/delivery.md`](../policies/delivery.md): action authorization.

Adapters forward the validated review focus and worker briefing unchanged.
Forge owns scope, mutation, delivery-candidate, and acceptance semantics; the
host decides worker physical execution and scheduling. Private worker
worktrees, sandboxes, overlays, and containers stay out of Forge state and
result metadata. Writable changes are materialized into the canonical delivery
checkout and validated there before acceptance.

## Installation boundary

Use the user-level link installer:

```text
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
```

Each invocation handles one harness and leaves project configuration alone.
Conflicting harness configuration must be reviewed before installation. The
adapter catalog is not installed.

## Adapters

- [Pi](pi/README.md): first-class prompt and runtime bridge;
- [OpenCode](opencode/README.md): compatible commands and native-agent bridge;
- [OMP](omp/README.md): experimental prompt and runtime bridge;
- [Claude Code](claude-code/README.md): experimental skill projection; and
- [Shared Agent Skill](shared/agent-skill/README.md): experimental Codex/Cursor
  projection.
