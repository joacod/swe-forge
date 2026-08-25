# Harness Adapters

Adapters expose the canonical SWE Forge workflow and explicit delivery actions
through harness-native features. They are optional, asymmetric integration
layers, not alternate workflow definitions. The canonical workflow is
harness-agnostic; each adapter translates its semantics onto demonstrated host
capabilities. A projection can be useful without feature parity or real harness
validation.

## Source of Truth

Always update these canonical files first:

- `../../AGENTS.md`
- `../../SWE-FORGE.md`
- `../../.swe-forge/workflows/`
- `../../.swe-forge/agents/`
- `../../.swe-forge/contracts/`
- `../../.swe-forge/policies/`

An adapter may contain a loader, command, permission mapping, or host capability
documentation. It must point the harness back to canonical files rather than
copying their content. The OpenCode and Pi delivery loaders expose separate
`git-commit`, `git-push`, `git-pr`, and `git-sync` actions; canonical behavior
lives in `../policies/delivery.md`. The installation source of truth is
`registry.tsv`; it maps harnesses to selected payloads and destinations.

## Shared Workflow Behavior

All adapters expose the same canonical workflow and stage-triggered load sets.
Keep detailed rules in their owners and use these references when building or
reviewing a host projection:

- [`SWE-FORGE.md`](../../SWE-FORGE.md) — activation, lifecycle, topology,
  delivery mode, acceptance, and ownership/load rules;
- [`tools/swe-forge-invocation`](../tools/swe-forge-invocation) — the one
  portable invocation parser/bootstrap primitive;
- [`workflows/ticket.md`](../workflows/ticket.md) — normalized-fact ingestion
  and sequencing;
- [`tools/swe-forge-worker-brief`](../tools/swe-forge-worker-brief) and
  [`contracts/worker-brief.md`](../contracts/worker-brief.md) — canonical worker
  briefing rendering, validation, bounded context, and dependency handoffs;
- [`policies/delegation.md`](../policies/delegation.md) — semantic delegation
  boundaries and root-owned dependency selection;
- [`policies/delivery.md`](../policies/delivery.md) — delivery authorization;
- [`policies/context.md`](../policies/context.md) — continuation and compaction;
- [`policies/verification.md`](../policies/verification.md) — quality gates; and
- [`policies/evidence.md`](../policies/evidence.md) — fingerprints, checks, and
  receipts.

Adapter-specific files should document only host syntax, discovery paths,
permissions, native capabilities, and behavior that cannot be represented by
canonical files. They must not preload stage-specific sources or copy canonical
procedure into a host prompt.

For GitHub-backed delivery adapters, the cleanest implementation is a read-only
remote default-branch lookup immediately before PR composition, followed by the
native draft flag when requested. Keep the host-specific mechanism in the
adapter/delivery layer; the canonical policy owns precedence, template
preservation, and draft semantics.

## Installation Boundary

The files in this directory are portable templates and documentation. They are
not discovered automatically by a harness while they remain here. Installation
links only the selected adapter projection and canonical support tree into the
user-level harness locations. The adapter catalog itself is never installed.

Use `scripts/swe-forge install <harness>` and
`scripts/swe-forge verify <harness>`. The installer always links artifacts to
the stable checkout, and each invocation handles one harness.

A harness may have its own project-specific configuration, but that is separate
from SWE Forge installation. Do not overwrite conflicting harness configuration;
review it manually first.

## Adapters

- [Pi](pi/README.md): First-class user-level prompt-template bridge;
- [OpenCode](opencode/README.md): Compatible user-level command and optional
  native-agent bridge pattern;
- [OMP](omp/README.md): experimental user-level prompt-template projection;
- [Claude Code](claude-code/README.md): experimental user-level skill
  projection; and
- [Shared Agent Skill](shared/agent-skill/README.md): experimental Codex and
  Cursor projection.
