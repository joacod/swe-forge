# Pi Adapter

Pi exposes SWE Forge through prompt templates and an optional runtime extension.
Canonical behavior lives in the installed support tree; richer Pi integration
is not a core requirement.

## Installation

```bash
scripts/swe-forge install pi
scripts/swe-forge verify pi
```

The installer links:

```text
~/.pi/agent/prompts/{swe-forge,git-commit,git-push,git-pr,git-sync}.md
~/.pi/agent/extensions/swe-forge-runtime.ts
~/.pi/agent/swe-forge/
```

Loaders resolve canonical files from `~/.pi/agent/swe-forge/`, never a
project-local `.swe-forge/`. The invocation parser is under that support root.
The optional `swe_forge_subagent` package is not installed; `SUBAGENTS` falls
back to `SOLO`/sequential when absent.

## Invocation

```text
/swe-forge <ticket>             # PR + automatic topology
/swe-forge guided <ticket>      # guided human pause
```

The template requires explicit `/swe-forge` and passes `$ARGUMENTS` unchanged.
The runtime invokes the shared parser once and injects normalized facts. The
canonical workflow owns status, delivery policy, and routing.

## Runtime boundary

The extension probes the parser and optional worker capability at invocation,
reads the bounded continuation projection, refreshes it through
`before_agent_start` and lifecycle hooks, maps exact active-PR `merged` shorthand
to `/git-sync merged`, and passes the validated root brief unchanged in
`workerBriefing`.

It does not choose topology, reconstruct state, or install the optional package.
It gates native workers to canonical `SUBAGENTS`, checks role/profile/brief, and
leaves results to root acceptance. Private worker environments are not Forge
state; writable results are materialized and validated in the canonical checkout.

The host owns context preservation, compaction, retry, restoration, worker
execution, and scheduling. Missing, stale, or incompatible capability/state
uses visible `SOLO`/sequential fallback.

Pi was checked against version `0.84.2` documentation and types on `2026-08-15`:

- https://pi.dev/docs/latest/extensions
- https://pi.dev/docs/latest/prompt-templates
