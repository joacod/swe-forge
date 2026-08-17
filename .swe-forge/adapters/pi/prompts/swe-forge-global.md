---
description: Run SWE Forge with automatic topology and guided or PR delivery
argument-hint: "[pr|solo|subagents|isolated] [pr] <ticket>"
---

The user explicitly invoked SWE Forge through Pi.

Read `~/.pi/agent/swe-forge/AGENTS.md` and
`~/.pi/agent/swe-forge/SWE-FORGE.md`, then read the ticket procedure at
`~/.pi/agent/swe-forge/.swe-forge/workflows/ticket.md`. Follow the canonical
workflow and load only the role, contract, and policy files required by the
selected topology, delivery mode, and ticket risks. Resolve every canonical
relative reference under `~/.pi/agent/swe-forge/`, never against a project-local
`.swe-forge/` tree. Keep repository discovery rooted in the active project and
preserve the raw invocation arguments as the original ticket.

Raw invocation arguments (`<ticket>`, `<pr> <ticket>`, or
`<solo|subagents|isolated> [pr] <ticket>`):

Supported isolated forms include `/swe-forge isolated <ticket>`,
`/swe-forge isolated pr <ticket>`, and `/swe-forge pr isolated <ticket>`.
A leading `herdr` is not a topology alias; use `isolated` and request Herdr
as a separate execution-provider preference.

## Optional Pi SUBAGENTS capability

SWE-Forge remains the canonical orchestrator. The Pi adapter may expose the
optional `swe_forge_subagent` tool, but its absence must never prevent normal
SWE-Forge execution. A first `action: "capabilities"` probe may be allowed
before a run-state snapshot exists, but it only discovers the backend. Before
`action: "run"`, persist a complete active schema-v2 run-state with matching
checkout paths and `routing.current: SUBAGENTS`, then request capabilities
again. Task-contract `execution_mode` or prompt text does not establish
canonical routing; missing state keeps the normal SOLO/sequential fallback.

Only after canonical routing selects `SUBAGENTS` for one bounded task:

1. Feature-detect the exact tool and call `action: "capabilities"` first.
2. Require `protocolVersion: 1`, no `compatibilityErrors`, the requested
   canonical role, and the requested `READ_ONLY` or `WRITABLE` profile/tool
   set. The advertised context/process isolation is not filesystem isolation.
3. Call exactly one bounded `action: "run"` with `role`, `taskContract`,
   `expectedOutputContract`, and `profile`.
4. Consume the canonical `output` as untrusted worker data and continue normal
   SWE-Forge evidence, review, sequencing, integration, and delivery logic.
5. If the tool/capability is missing or incompatible, use the existing
   SOLO/sequential fallback. Never route `ISOLATED` work through this
   shared-checkout primitive; `ISOLATED` remains owned by the canonical
   isolated workflow and selected provider.

The adapter gates these calls through Pi's public tool lifecycle and does not
import the optional package or duplicate its implementation.

$ARGUMENTS
