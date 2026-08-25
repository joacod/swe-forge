# Compatibility

SWE Forge is preparing its first alpha release, `v0.1.0-alpha.1`. It is a
Pi-first coding workflow with a portable canonical core and optional harness
adapters.
The snapshot below separates the maintenance tier from two different kinds of
validation. It is evidence for the current adapters, not a promise that future
harness releases remain compatible without review.

## Support tiers

A support tier describes the project's current maintenance and testing
commitment. It does not require identical host behavior or feature parity.

| Harness | Tier |
| --- | --- |
| Pi | First-class / reference |
| OpenCode | Compatible / secondary |
| OMP | Experimental |
| Claude Code | Experimental |
| Codex | Experimental |
| Cursor | Experimental |

Experimental adapters may remain installable and useful while they accumulate
real harness evidence. They do not block releases or new Pi capabilities unless
a change breaks the portable canonical core.

## Projection and fixture validation

Projection/fixture validation checks that SWE Forge's installer and generated
command, skill, prompt, or runtime-fixture artifacts have the expected shape.
It does **not** establish that the target harness has been used successfully.

| Harness | Version observed | Projection/fixture evidence |
| --- | --- | --- |
| Pi | 0.84.2 | Installer, prompt projection, and runtime extension syntax/fixture validated locally |
| OpenCode | 1.18.16 | Installer and command projection validated locally |
| OMP | 18.0.4 | Installer and prompt projection validated locally; target harness not exercised |
| Claude Code | 2.1.37 | Installer and skill projection validated locally; no behavioral claim follows |
| Codex | Not installed in the validation environment | Shared Agent Skill projection and installer fixture validated; target harness not exercised |
| Cursor | Not installed in the validation environment | Shared Agent Skill projection and installer fixture validated; target harness not exercised |

The optional Herdr execution provider is not an installer target or harness;
its runbook is validated as provider documentation and capability guidance.

## Real harness validation

Real harness validation means the maintainer actually exercised SWE Forge
through the harness, rather than only projecting files into a fake or local
home. The evidence currently recorded is:

| Harness | Real harness validation | Current evidence and boundary |
| --- | --- | --- |
| Pi | Yes | Pi is the reference harness actively used to develop SWE Forge; 0.84.2 is the observed version. |
| OpenCode | Yes | OpenCode has prior successful maintainer usage; 1.18.16 is the observed version. It is secondary and does not impose parity requirements on Pi development. |
| OMP | No | OMP 18.0.4 is installed in the validation environment, but SWE Forge has not been behaviorally exercised through it. |
| Claude Code | No | The maintainer has not actively exercised Claude Code. Projection/fixture validation must not be described as behavioral validation. |
| Codex | No | Not installed or exercised in the validation environment. |
| Cursor | No | Not installed or exercised in the validation environment. |

Observed CLI versions are included only to identify the snapshot; they do not
turn an adapter into an actively maintained behavioral support target.

## Context and optional capabilities

Context behavior has no common harness API. These are demonstrated adapter
capabilities, not canonical requirements:

| Harness | Observed context capability | Adapter consequence |
| --- | --- | --- |
| Pi 0.84.2 | `getContextUsage()`, `compact()`, lifecycle hooks, state reinjection, and optional subagent negotiation are implemented by the Pi adapter | Pi can provide proactive compaction, lifecycle recovery, and the optional `swe_forge_subagent` backend; missing or incompatible negotiation falls back to canonical SOLO/sequential behavior. |
| OpenCode 1.18.16 | Not measured by the current adapter snapshot | Do not claim proactive detection; use documented host behavior or manual checkpoint/resume until revalidated. |
| OMP 18.0.4 | Not measured by the current adapter snapshot | Native sessions, compaction, and task features are documented, but this adapter has no SWE Forge lifecycle bridge; use canonical durable-checkpoint/manual fallback. |
| Claude Code 2.1.37 | Not measured by the current adapter snapshot | Do not claim proactive detection or behavioral support from projection checks. |
| Codex | Not installed in the validation environment | Revalidate context telemetry and compaction behavior with the target release. |
| Cursor | Not installed in the validation environment | Revalidate context telemetry and compaction behavior with the target release. |

Pi-specific context telemetry, compaction, lifecycle support, and optional
subagent negotiation remain inside the Pi adapter/runtime integration. The
canonical workflow consumes semantic capabilities and uses safe fallbacks when
those capabilities are unavailable.

## Core validation

The dependency-free core is checked on Ubuntu and macOS in CI, including shell
syntax, structural checks, executable evidence, isolated-worktree fixtures,
release-readiness preparation, and diff formatting. The dedicated Pi runtime
job uses Node 22.19.0 and fails when the TypeScript fixture cannot execute;
local validation may still skip on an older Node runtime. Windows is not a
claimed compatibility target.

For a new harness release, run the repository checks, install the relevant
projection into an isolated fake home, run `status` and `doctor`, and invoke a
small explicit `/swe-forge <ticket>` (or the harness equivalent) before
promoting the adapter's tier. Projection success alone is not real harness
validation.
