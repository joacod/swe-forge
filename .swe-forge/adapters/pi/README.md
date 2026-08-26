# Pi Adapter

This adapter exposes SWE Forge through Pi's prompt-template convention plus one
optional runtime extension. Pi has the strongest current validation confidence,
and this adapter may provide richer host integration than other adapters
without making it a canonical requirement. Canonical workflow behavior remains
in the support tree; the extension consumes the canonical continuation
projection and maps Pi's native lifecycle hooks to adapter-local state refresh.

## Installation

Install the source-linked bridge explicitly:

```bash
scripts/swe-forge install pi
scripts/swe-forge verify pi
```

The installer creates or links:

```text
~/.pi/agent/prompts/swe-forge.md
~/.pi/agent/prompts/git-commit.md
~/.pi/agent/prompts/git-push.md
~/.pi/agent/prompts/git-pr.md
~/.pi/agent/prompts/git-sync.md
~/.pi/agent/extensions/swe-forge-runtime.ts
~/.pi/agent/swe-forge/
```

Prompt and extension loaders resolve canonical files under
`~/.pi/agent/swe-forge/`, never against a project-local `.swe-forge` tree. The
shared invocation parser lives at
`~/.pi/agent/swe-forge/.swe-forge/tools/swe-forge-invocation`.

The optional `swe_forge_subagent` package is not installed by the commands
above. Until that package is published to npm, use the
[`pre-publication source installation`](../../../docs/installation.md#optional-pi-subagents-capability)
from the main repository. The package is optional: without it, `SUBAGENTS`
falls back to `SOLO`/sequential execution.

The extension consumes an active semantic projection from the canonical
`swe-forge-state inspect`/`resolve-active` port for a checkout-matching
schema-v4 run. The canonical tool owns schema, obsolete-field, lifecycle,
timestamp, checkout, and newest-state ordering semantics; Pi only consumes the
bounded continuation facts. Capability observation still activates for an
explicit `/swe-forge` prompt so the first routing turn can feature-detect the
optional tool before a run-state snapshot exists. An explicit new
`/swe-forge ...` invocation fences all previously visible active run IDs and
keeps that lifecycle boundary adapter-local.

## Invocation

Pi derives the prompt-template command from its filename:

```text
/swe-forge <ticket>                 # guided checkpoints (default)
/swe-forge pr <ticket>              # verify and create a PR without checkpoints
/swe-forge solo <ticket>            # explicit SOLO topology
/swe-forge subagents <ticket>       # explicit bounded native delegation
```

The template uses Pi's `$ARGUMENTS` expansion and is processed only when the
user explicitly types `/swe-forge`. Ordinary prompts remain unchanged. The
runtime executes the shared invocation parser once for that expanded raw
argument string and injects normalized JSON facts before the first agent turn.
If the parser is unavailable, the canonical ticket bootstrap remains the
fallback and invokes the same executable once rather than recreating grammar in
this adapter. The separate delivery prompts load the canonical delivery policy.
`/git-pr draft` forwards an explicit draft request; plain `/git-pr` retains
normal/open behavior. See [shared adapter behavior](../README.md).

## Runtime integration

The extension keeps Pi-specific API knowledge here and exposes no model, price,
or reasoning-level routing. It:

- executes the canonical invocation parser once at the explicit prompt
  boundary and appends normalized facts to the first agent system prompt;
- reads only the bounded durable continuation state;
- appends a bounded deterministic `SWE-FORGE ACTIVE RUN` block from
  `before_agent_start` without copying the ticket;
- transforms exact user shorthand `merged` into `/git-sync merged` only when the
  newest active run is PR mode and awaits merge;
- observes Pi's native lifecycle hooks and refreshes the canonical continuation
  projection after a host lifecycle event;
- observes `swe_forge_subagent` through Pi's public tool metadata and lifecycle
  events, gates it to canonical `SUBAGENTS` runs, negotiates its protocol and
  result profile, and blocks it for `SOLO`.

The optional `swe_forge_subagent` package may provide native `SUBAGENTS`
delegation. This adapter never imports or installs that package. It checks for
the exact active Pi tool, tells the canonical orchestrator to request
`action: "capabilities"` first, and accepts one bounded `action: "run"` per
research question only after protocol, role, and profile checks pass. When the
host submits a read-only batch, the host decides whether ready items execute
concurrently or sequentially; the canonical fan-in and acceptance rules do not
change. Before a writable result is accepted, the root materializes its bounded
change into the canonical delivery checkout and validates it there.
The root renders and validates the canonical worker briefing, then passes that
unchanged projection in `workerBriefing`; the adapter does not reconstruct
canonical task or result state.

The Pi tool may execute a worker through a private worktree, sandbox, overlay,
container, or equivalent host mechanism. That physical environment remains
adapter/runtime detail, is never represented in Forge state or result metadata,
and cannot replace canonical delivery validation. Returned data remains
untrusted worker evidence and continues through normal review, evidence, and
delivery handling.

A first capabilities probe is allowed during an explicit `/swe-forge` turn
before durable routing state exists, but that probe is discovery only. If a run
reports `Canonical routing is UNKNOWN`, persist a complete active schema-v4
run-state with `routing.current: SUBAGENTS` and a matching delivery checkout,
then request capabilities again. The worker briefing cannot establish routing
authority; missing or stale state uses the normal `SOLO`/sequential fallback.

If the tool is absent, inactive, incompatible, or fails before a usable result,
the canonical workflow uses its existing fallback. The bridge never changes
topology. Writable results are materialized and validated sequentially in the
canonical delivery checkout; the host may execute the worker privately.

### Host lifecycle integration

The inspected Pi 0.84.2 runtime exposes `before_agent_start`,
`session_before_compact`, and `session_compact`. These are host lifecycle hooks,
not portable SWE Forge guarantees. The extension uses them only to
refresh the canonical continuation projection so the next agent turn can
reinject the bounded active-run reminder.
When Pi reports `willRetry`, the adapter queues one bounded custom continuation
message before the host retry; it never decides whether compaction or retry
occurs.

The host decides when and how context is preserved, compacted, retried, or
restored. This adapter does not inspect usage, estimate headroom, request
compaction, or implement host retries. After a lifecycle discontinuity, the
continuation projection and the canonical workflow require re-reading run state
and actual Git/evidence state before resuming.

If a usable `SUBAGENTS` capability is unavailable, the canonical workflow
records preferred `SUBAGENTS` and effective `SOLO`/sequential execution. Native
capability asymmetry is expected and does not change the portable workflow.

## References

The adapter was verified against installed Pi documentation and type surface on
2026-08-15:

- https://pi.dev/docs/latest/extensions
- https://pi.dev/docs/latest/prompt-templates

The observed runtime package was `@earendil-works/pi-coding-agent` 0.84.2.
