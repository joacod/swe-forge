# Agent Instructions

## Default

Use the repository normally. Do not load or execute SWE Forge unless the user explicitly:

- says `Use SWE Forge` or `Follow SWE Forge`;
- references `SWE-FORGE.md`; or
- invokes `/swe-forge` or a harness equivalent.

When activated, read `SWE-FORGE.md` and the ticket workflow. Load only the
role, contract, and policy sources that the ticket needs.

## Core maintenance rule

Optimize for the user path: one focused idea or ticket to one reviewable PR.

Every mandatory step, tool call, state field, validation, contract, and rule
must justify its cost with a concrete improvement in correctness, safety, or
recovery. Prefer removing ceremony over making ceremony faster.

Human PR review is the final boundary: SWE Forge adds useful confidence; it does
not need to prove the change perfect before delivery. Keep public UX about user
intent and orchestration mechanics internal.

Keep Forge opinionated for this repository and author. Stay harness-agnostic
where that has real value, but do not add abstractions for hypothetical
consumers. Forkability is fine.

## Maintaining SWE Forge

- Support only the current run-state schema. Change producers, consumers,
  validators, adapters, and fixtures together. Reject obsolete state; do not
  add compatibility shims or duplicate fields without a current need.
- Optimize for one ticket, one reviewable delivery, one writable delivery
  checkout. Native subagents are bounded helpers. Do not add writable-worker
  scheduling, worker worktrees, external execution providers, fleet or
  scheduler layers, or cross-ticket orchestration.
- Preserve root/orchestrator authority, bounded worker context, no peer
  communication, proportional results, compact accepted dependency digests,
  conservative read-only fan-out/fan-in, and stage-triggered policy loading.
  Add deterministic enforcement only when the risk/reward is clear.
- Prefer deletion, consolidation, canonical ownership, small deterministic
  guards, and low-risk changes over new state, message, telemetry, benchmark,
  speculative abstraction, or compatibility machinery. Detailed contracts and
  policies remain canonical in `SWE-FORGE.md` and `.swe-forge/`.
- Before changing canonical workflow behavior, contracts, policies, routing,
  delegation, or harness boundaries, read `docs/architecture.md`. For adapter
  work, also read `docs/adding-a-harness.md`, `.swe-forge/adapters/README.md`,
  and the target adapter README.
- For CI work, treat `.github/workflows/ci.yml` and
  `scripts/validate-swe-forge --list`/`--plan` as the sources of truth. For
  non-CI work, do not inspect the workflow or run its unrelated groups. Do not
  infer automatic CI coverage from supported harnesses or operating systems,
  or run every harness/OS group without a ticket-specific reason.
- Keep canonical routing harness-agnostic: it selects topology; adapters
  translate host capabilities without selecting topology.
- Keep harness APIs, paths, lifecycle hooks, approvals, task mechanisms,
  configuration, and syntax in adapters. Map host features to existing
  semantic capabilities first; adapter-only translation is the default.
- If a core change is necessary, add the smallest harness-neutral semantic
  contract useful without the requesting harness. Do not add harness-name
  branches to canonical behavior or user-facing Forge behavior.
- Capability asymmetry is valid. Adding a harness must not change existing
  behavior unless an independent canonical contract requires it.

## Installation requests

Installation is a user-level link to the stable SWE Forge checkout, not workflow
activation or project configuration. For an installation request, read
`docs/installation.md` and the target adapter README, then use:

```text
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
```

Show conflicting harness configuration before changing it. Do not merge or
overwrite it.
