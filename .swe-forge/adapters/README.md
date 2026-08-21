# Harness Adapters

Adapters expose the canonical SWE Forge workflow and its explicit delivery
actions through harness-native features. They are optional integration layers,
not alternate workflow definitions or execution providers.

## Source of Truth

Always update these canonical files first:

- `../../AGENTS.md`
- `../../SWE-FORGE.md`
- `../../.swe-forge/workflows/`
- `../../.swe-forge/agents/`
- `../../.swe-forge/contracts/`
- `../../.swe-forge/policies/`
- `../../.swe-forge/providers/` for optional execution-provider runbooks

An adapter may contain a loader, command, permission mapping, or host capability
documentation. It must point the harness back to canonical files rather than
copying their content. The OpenCode and Pi delivery loaders expose separate
`git-commit`, `git-push`, `git-pr`, and `git-sync` actions; canonical behavior
lives in `../policies/delivery.md`. The installation source of truth is
`registry.tsv`; it maps harnesses to selected payloads and destinations.

An execution provider is not a harness adapter. Providers expose optional
isolated lifecycle capabilities only after canonical routing selects
`ISOLATED`. Provider documentation is canonical support content under
`../providers/`, source-linked with the canonical support tree; it is not an
adapter registry artifact. Herdr documentation lives under
`../providers/herdr/`; it is not installed automatically as a Herdr tool and
has no adapter registry entry.

## Shared Workflow Behavior

All adapters expose the same canonical workflow and stage-triggered load sets.
Keep the detailed rules in their owners and use these references when building
or reviewing a host projection:

- [`SWE-FORGE.md`](../../SWE-FORGE.md) — activation, lifecycle, topology,
  delivery-mode, acceptance, and ownership/load rules
- [`workflows/ticket.md`](../workflows/ticket.md) — ticket parsing, sequencing,
  and conditional source loads
- [`policies/delegation.md`](../policies/delegation.md) and
  [`contracts/worker-brief.md`](../contracts/worker-brief.md) — bounded worker
  context and dependency handoffs
- [`policies/delivery.md`](../policies/delivery.md) — delivery and local-resource
  authorization
- [`policies/context.md`](../policies/context.md) — continuation and compaction
- [`providers/`](../providers/README.md) — isolated provider boundaries and
  runbooks

Adapter-specific files should document only host syntax, discovery paths,
permissions, native capabilities, and other behavior that cannot be
represented by the canonical files. They must not preload stage-specific
sources or copy canonical procedure into a host prompt. The canonical workflow,
policies, contracts, and provider boundary remain authoritative.

For GitHub-backed delivery adapters, the cleanest implementation is a
read-only remote default branch lookup (for example, `gh repo view` plus `gh api` or a
remote default ref) immediately before PR composition, followed by the native
draft flag when requested (for example, `gh pr create --draft`). Keep this
provider-specific mechanism in the
adapter/delivery layer; the canonical policy owns the precedence, template
preservation, and draft semantics.

## Installation Boundary

The files in this directory are portable templates and documentation. They are
not discovered automatically by a harness while they remain here. Installation
links only the selected adapter projection and canonical support tree into the
user-level harness locations. The adapter catalog itself is never installed.

For supported harnesses, use `scripts/swe-forge install <harness>` and
`scripts/swe-forge verify <harness>`. The installer always links artifacts to
the stable checkout, and each invocation handles one harness. Providers are not
installed as a side effect.

A harness may have its own project-specific configuration, but that is separate
from SWE Forge installation. Do not overwrite conflicting harness
configuration; review it manually first.

## Adapters

- [OpenCode](opencode/README.md): user-level command and optional native-agent
  bridge pattern
- [Claude Code](claude-code/README.md): user-level skill projection
- [Pi](pi/README.md): user-level prompt-template bridge
- [Shared Agent Skill](shared/agent-skill/README.md): Codex and Cursor projection
- [Codex](codex/README.md): shared Agent Skill integration notes
- [Cursor](cursor/README.md): shared Agent Skill integration notes

Optional execution providers are documented separately under
[`.swe-forge/providers/`](../providers/README.md), including the
[Herdr provider](../providers/herdr/README.md).
