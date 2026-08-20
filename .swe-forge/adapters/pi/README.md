# Pi Adapter

This adapter exposes SWE Forge through Pi's global prompt-template convention
plus one small optional runtime extension. Canonical workflow behavior remains
in the support tree; the extension translates Pi lifecycle capabilities into
the generic context and continuation contracts and feature-detects the optional
`swe_forge_subagent` capability.

## Global Installation

Install the source-linked global bridge explicitly:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
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

The prompt and extension loaders resolve canonical files under
`~/.pi/agent/swe-forge/`, never against a project-local `.swe-forge/` tree.
Link mode is the default, so updating the stable SWE Forge checkout updates
the installed source after review. Global copy mode remains unsupported.

The optional `swe_forge_subagent` package is not installed by the commands
above. Until that package is published to npm, use the
[pre-publication source installation](../../../docs/installation.md#optional-pi-subagents-backend)
from the main repository; it clones both repositories, installs the package's
local dependencies, and registers its local path with Pi. The package is
optional: without it, `SUBAGENTS` falls back to SOLO/sequential execution.

Continuation and compaction behavior is inert unless the extension finds an
active, checkout-matching `run-state.yaml` with `workflow_active: true` (or a
compatible active schema-v2 status). The optional capability observation also
activates for an explicit `/swe-forge` prompt so the first routing turn can
feature-detect the tool before a run-state snapshot exists. It looks first at
`SWE_FORGE_RUN_STATE`/`SWE_FORGE_STATE`, then an ignored project
`.swe-forge/runs/` pointer or directory, and finally bounded external
temporary-state locations. It chooses the newest active snapshot by
`continuation.updated_at` and file mtime; terminal or stale state is ignored.
An operator can therefore use an explicit state path without allowing an old
pointer to override a newer run.

## Invocation

Pi derives the prompt-template command from its filename:

```text
/swe-forge <ticket>                 # guided checkpoints (default)
/swe-forge pr <ticket>              # verify and create a PR without checkpoints
/swe-forge isolated <ticket>        # explicit isolated topology
/swe-forge isolated pr <ticket>     # isolated topology with PR delivery
/swe-forge pr isolated <ticket>     # delivery token first
```

The canonical parser also supports `/swe-forge solo ...` and
`/swe-forge subagents ...`. A leading `herdr` is not a topology alias; the
workflow gives migration guidance to use `isolated` and request Herdr as a
separate provider preference. To request a provider without changing the
reserved topology grammar, state it in the ticket, for example: "Use
`isolated` with Herdr as the execution provider." The provider-selection policy
records that preference separately.

The template uses Pi's `$ARGUMENTS` expansion and is only processed when the
user explicitly types `/swe-forge`. Ordinary prompts remain unchanged. The
separate `/git-commit`, `/git-push`, `/git-pr`, and `/git-sync` prompts load the
canonical delivery policy. `/git-pr draft` forwards an explicit draft request;
plain `/git-pr` retains normal/open behavior. See [shared adapter behavior](../README.md)
for the workflow and delivery rules.

## Runtime integration

The extension keeps Pi-specific API knowledge here and exposes no model,
provider, price, or reasoning-level routing. It:

- reads only the compact durable continuation state;
- appends a bounded deterministic `SWE-FORGE ACTIVE RUN` block to the current
  system prompt from `before_agent_start`, without copying the ticket or
  persisting a duplicate message;
- transforms exact user shorthand `merged` into `/git-sync merged` only when
  the newest active run is PR mode and is awaiting merge;
- observes `session_before_compact` and `session_compact` without replacing
  Pi's summarizer;
- observes `swe_forge_subagent` through Pi's public tool metadata and tool
  lifecycle events, gates it to canonical `SUBAGENTS` runs, negotiates its
  protocol/profile/isolation metadata, and blocks it for `SOLO` or `ISOLATED`;
- uses `agent_settled`, rather than `agent_end`, as the preferred boundary for
  context inspection because Pi may retry, compact-and-retry, or process queued
  follow-ups after `agent_end`; and
- uses `ctx.getContextUsage()` and `ctx.compact()` only when those capabilities
  are present, the run state marks a safe boundary, and the remaining headroom
  is insufficient for the persisted next action. It records compact lifecycle
  events as non-authoritative session entries and never treats them as Git or
  task evidence.

The extension resolves Pi's effective compaction reserve from trusted project
`.pi/settings.json` over global `~/.pi/agent/settings.json`, matching Pi's
nested settings precedence, with the documented default as a safe fallback.
Malformed or unavailable files are ignored and clean file metadata is cached to
avoid unnecessary repeated reads. A run-state `expected_context_tokens`
estimate improves the headroom calculation when present; a reliable
`near-limit` state at a safe boundary is strong enough to request compaction
without that estimate. `projected_pressure: high` is planning evidence only
and cannot trigger compaction by itself. `overflow` and `compacting` states
remain under Pi's native recovery lifecycle, and unchanged state/cooldown
protection prevents a duplicate request. If telemetry, a compaction API, or an active run-state
snapshot is unavailable, it does nothing and the canonical workflow falls back
to durable checkpoints/manual recovery.

The optional `swe_forge_subagent` package may provide the native `SUBAGENTS`
delegation backend. This adapter never imports that package or installs it. It
checks for the exact active Pi tool, tells the canonical orchestrator to request
`action: "capabilities"` first, and accepts one bounded `action: "run"` per
research question only after protocol, role, profile, and isolation checks
pass. When the capability reports read-only parallel support, the orchestrator
may launch the independent questions as one batch and must wait at the root
fan-in barrier before continuing; coupled questions remain root-only or
sequential. Before the run, the orchestrator places the compact
`worker_briefing` projection described by
`~/.pi/agent/swe-forge/.swe-forge/contracts/worker-brief.md` in `taskContract`
with the relevant role and result/review contract. Its inclusion and dependency
rules remain canonical. The returned result remains untrusted worker data and
continues through SWE-Forge's normal review, evidence, integration, and delivery
handling.

A first capabilities probe is allowed during an explicit `/swe-forge` turn
before durable routing state exists, but that probe is discovery only. If a run
attempt reports `Canonical routing is UNKNOWN`, no active checkout-matching
run-state was discoverable (or it did not expose a usable current topology).
Persist a complete active schema-v2 run-state with `routing.current: SUBAGENTS`
and matching invocation/delivery checkout paths, then request capabilities
again. Do not use `execution_mode` in the task contract or prompt as a routing
workaround; the safe result of missing state is the normal SOLO/sequential
fallback.

If the tool is absent, inactive, incompatible, or fails before a usable result,
the canonical workflow uses its existing SOLO/sequential fallback. The bridge
never changes topology and never turns `ISOLATED` work into a shared-checkout
child. Read-only Herdr workers remain `SUBAGENTS` with shared write isolation;
only proven concurrent writable worktrees can be `ISOLATED`.

### Context management

The inspected Pi 0.84.2 runtime provides `ExtensionContext.getContextUsage()`,
`ExtensionContext.compact()`, `before_agent_start`,
`session_before_compact`, `session_compact`, and `agent_settled`. Pi's native
compaction threshold is based on the provider context window and configured
reserve, with documented defaults of `reserveTokens: 16384` and
`keepRecentTokens: 20000`. Pi also recognizes provider-reported overflow or a
recoverable length response, compacts, and retries the interrupted turn once.

These are host capabilities, not portable SWE Forge guarantees. The extension
requests proactive compaction only after state persistence at a safe boundary;
it never fights host threshold compaction or launches a duplicate retry. After
any observed compaction or overflow recovery, the canonical context policy
requires re-reading the external working spec and run state, inspecting Git
`HEAD`/diff, and resuming only from `continuation.next_action`. A model or
provider label is not evidence of context capacity or recovery behavior.

Pi does not provide native writable isolated workers by default. If a usable
`SUBAGENTS` backend is unavailable, the canonical workflow records preferred
`SUBAGENTS` and effective `SOLO`/sequential execution. `ISOLATED` remains
portable at the workflow level and requires demonstrated native worktree
capabilities or the optional Herdr provider; it is not universally available in
every Pi setup. Herdr remains optional and is never installed automatically.

## References

The adapter was verified against the installed Pi documentation and type
surface on 2026-08-15:

- https://pi.dev/docs/latest/extensions
- https://pi.dev/docs/latest/compaction
- https://pi.dev/docs/latest/prompt-templates
- https://pi.dev/docs/latest/settings

The observed runtime package was `@earendil-works/pi-coding-agent` 0.84.2.
