# Compatibility

SWE Forge is preparing its first alpha release, `v0.1.0-alpha.1`. It is a
harness-agnostic workflow with a portable canonical core and optional harness
adapters. This record separates maintenance tier from validation evidence. It
records current evidence, not a promise that future harness releases remain
compatible without review.

## Support tiers

A support tier describes the project's current maintenance and testing
commitment. It does not require identical host behavior or feature parity.

| Harness | Tier |
| --- | --- |
| Pi | First-class |
| OpenCode | Compatible |
| OMP | Experimental |
| Claude Code | Experimental |
| Codex | Experimental |
| Cursor | Experimental |

Experimental adapters may remain installable and useful while they accumulate
real harness evidence. They do not block changes to the harness-agnostic
canonical workflow unless a change breaks a contract they legitimately consume.

## Projection and fixture validation

Projection/fixture validation checks that the installer and generated command,
skill, prompt, or runtime-fixture artifacts have the expected shape. It does
not establish that the target harness has been used successfully.

| Harness | Version observed | Projection/fixture evidence |
| --- | --- | --- |
| Pi | 0.84.2 | Installer, prompt projection, and runtime extension syntax/fixture validated locally |
| OpenCode | 1.18.16 | Installer and command projection validated locally |
| OMP | 18.0.4 | Installer, prompt/runtime projection, confined profiles, and adapter fixtures validated locally |
| Claude Code | 2.1.37 | Installer and skill projection validated locally; no behavioral claim follows |
| Codex | Not installed in the validation environment | Shared Agent Skill projection and installer fixture validated; target harness not exercised |
| Cursor | Not installed in the validation environment | Shared Agent Skill projection and installer fixture validated; target harness not exercised |

## Real harness validation

Real harness validation means the maintainer actually exercised SWE Forge through
the harness, rather than only projecting files into a fake or local home. The
evidence currently recorded is:

| Harness | Real harness validation | Current evidence and boundary |
| --- | --- | --- |
| Pi | Yes | Pi has the strongest current maintainer validation evidence; 0.84.2 is the observed version. |
| OpenCode | Yes | OpenCode has prior successful maintainer usage; 1.18.16 is the observed version. Its evidence does not impose parity requirements on other adapters. |
| OMP | Yes | OMP 18.0.4 was exercised through the normal automatic `/swe-forge` path. Canonical AUTO routing selected shared-checkout `SUBAGENTS`; two native read-only workers returned strict structured results, a temporary writable worker and sequential-writer guard were exercised, and capability-unavailable fallback was observed. The adapter remains Experimental. |
| Claude Code | No | The maintainer has not actively exercised Claude Code. Projection/fixture validation must not be described as behavioral validation. |
| Codex | No | Not installed or exercised in the validation environment. |
| Cursor | No | Not installed or exercised in the validation environment. |

Observed CLI versions identify the environment for this compatibility record;
they do not turn an adapter into an actively maintained behavioral support
target.

## Host lifecycle boundary

Host runtimes own context preservation, compaction, retry, restoration, and
related lifecycle mechanics. Adapter documentation may record observed native
hooks and continuation-reload behavior, but the canonical workflow does not
negotiate host context telemetry or compaction capabilities. Differences in
host lifecycle support do not create a parity requirement.

## OMP capability evidence

The 2026-08-25 evidence separates demonstrated technical capabilities from
support-tier commitment:

| Capability | Result | Boundary |
| --- | --- | --- |
| Native shared-checkout `SUBAGENTS` | Proven | AUTO state recorded `requested_mode: AUTO`, `routing.current: SUBAGENTS`, and native capability evidence. OMP emitted native task preparation and validation lifecycle records. |
| Canonical worker briefs | Proven | The two-item read-only batch and the single writable worker used validated `worker_briefing/v1` projections; assignments remained bounded. |
| Strict structured results | Proven | OMP returned caller-sourced strict structured data and the adapter recorded canonical `worker-result/v1` validation for every result. |
| Read-only fan-out/fan-in | Proven | Two real workers completed in one native batch; root consumption remained centralized. |
| Shared-checkout writer safety | Proven for the tested boundary | One real native writable worker changed only a temporary Git fixture; a two-writer native batch was refused before launch. |
| Capability-unavailable fallback | Proven | A fresh OMP process with `task` disabled reported the missing native capability and visible `SUBAGENTS` to `SOLO`/sequential fallback. |
| Complete worker confinement | Not proven | Declared OMP profiles restrict built-in tools and recursion, but the tested child also accessed mounted `mcp__node_repl_js`; no stronger claim is justified. |
| Headless approval behavior | Proven for supported native workers | Blocking native workers completed without an interactive approval prompt; approval was not treated as SWE Forge delivery authorization. |

The OMP support tier was **Experimental before and after** this run. Technical
capability evidence increased, but one dogfood run does not establish the
repeated maintenance commitment required for a support-tier change.

## Core validation

The dependency-free core is checked on Ubuntu and macOS in CI, including shell
syntax, structural checks, executable evidence, release-readiness preparation,
and diff formatting. The dedicated Pi runtime job uses Node 22.19.0 and fails
when the TypeScript fixture cannot execute; local validation may still skip on
an older Node runtime. Windows is not a claimed compatibility target.

For a new harness release, run repository checks, install the relevant
projection into a temporary fake home, run `status` and `doctor`, and invoke a
small explicit `/swe-forge <ticket>` (or harness equivalent) before promoting
the adapter's tier. Projection success alone is not real harness validation.
