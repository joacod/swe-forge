# Compatibility

SWE Forge is preparing its first alpha, `v0.1.0-alpha.1`. It has a portable
canonical core and optional asymmetric adapters. This document records current
evidence, not a promise that future harness releases remain compatible.

## Support tiers

A tier describes maintenance and testing commitment. It does not require equal
host behavior or feature parity.

| Harness | Tier |
| --- | --- |
| Pi | First-class |
| OpenCode | Compatible |
| OMP | Experimental |
| Claude Code | Experimental |
| Codex | Experimental |
| Cursor | Experimental |

Experimental adapters may remain useful while evidence accumulates. They do not
block canonical changes unless they consume a contract that the change breaks.

## Projection and fixture evidence

Projection checks verify installer and generated command, skill, prompt, or
runtime-fixture shape. They do not prove target-harness use.

| Harness | Version observed | Evidence |
| --- | --- | --- |
| Pi | 0.84.2 | Installer, prompt projection, runtime syntax, and fixture checked locally |
| OpenCode | 1.18.16 | Installer and command projection checked locally |
| OMP | 18.0.4 | Installer, prompt/runtime projection, confined profiles, and fixtures checked locally |
| Claude Code | 2.1.37 | Installer and skill projection checked locally; no behavioral claim |
| Codex | Not installed | Shared Agent Skill projection and installer fixture checked; harness not exercised |
| Cursor | Not installed | Shared Agent Skill projection and installer fixture checked; harness not exercised |

## Real harness validation

Real validation means the maintainer exercised Forge through the harness.

| Harness | Validated | Evidence and boundary |
| --- | --- | --- |
| Pi | Yes | Strongest current evidence; observed version `0.84.2`. |
| OpenCode | Yes | Prior successful maintainer use; observed version `1.18.16`. This does not impose parity on other adapters. |
| OMP | Yes | OMP `18.0.4` used through automatic `/swe-forge`: shared-checkout `SUBAGENTS`, two read-only workers, a temporary writer, a two-writer guard, and capability-unavailable fallback. Tier remains Experimental. |
| Claude Code | No | Not actively exercised; projections are not behavioral validation. |
| Codex | No | Not installed or exercised. |
| Cursor | No | Not installed or exercised. |

Observed versions identify the evidence environment; they do not establish
ongoing support.

## Host lifecycle

Hosts own context preservation, compaction, retry, restoration, and related
lifecycle mechanics. Adapters may record observed hooks and reload behavior;
the canonical workflow does not negotiate host telemetry or compaction parity.

## OMP capability evidence

| Capability | Result | Boundary |
| --- | --- | --- |
| Native shared-checkout `SUBAGENTS` | Proven | Automatic routing recorded preferred/current `SUBAGENTS` and native capability evidence. |
| Canonical worker briefs | Proven | Two read-only and one writable worker used validated JSON briefs with bounded assignments. |
| Strict structured results | Proven | OMP returned caller-sourced strict JSON; adapter validated every `worker-result/v1`. |
| Read-only fan-out/fan-in | Proven | Two workers completed in one native batch; root consumption stayed centralized. |
| Shared-checkout writer safety | Proven for tested boundary | One writer changed a temporary Git fixture; a two-writer batch was refused before launch. |
| Capability-unavailable fallback | Proven | Task-disabled process reported the missing capability and visible `SUBAGENTS` to `SOLO`/sequential fallback. |
| Complete worker confinement | Not proven | Profiles restrict built-ins and recursion, but the tested child accessed mounted `mcp__node_repl_js`. |
| Headless approval behavior | Proven for supported native workers | Blocking workers completed without an interactive prompt; approval was not delivery authorization. |

OMP was Experimental before and after the `2026-08-25` run. One dogfood run
does not justify a tier change.

## Core validation

The dependency-free core runs on Ubuntu and macOS in CI: shell syntax,
structural checks, evidence, release-readiness preparation, and diff formatting.
The Pi runtime job uses Node `22.19.0`; an older local Node may skip the
TypeScript fixture. Windows is not a claimed target.

For a new harness release, run repository checks, install its projection in a
fake home, run `status` and `doctor`, and invoke a small explicit
`/swe-forge <ticket>` (or equivalent) before promoting its tier. Projection
success alone is not real harness validation.
