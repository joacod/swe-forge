# Pi Adapter

Pi exposes SWE Forge through prompt templates and an optional runtime
extension. It has the strongest current validation confidence, but its richer
host integration is not a canonical requirement. Canonical workflow behavior
lives in the installed support tree.

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

Prompt and extension loaders resolve canonical files from
`~/.pi/agent/swe-forge/`, never a project-local `.swe-forge/` tree. The shared
invocation parser is under that support root. The optional `swe_forge_subagent`
package is not installed; when absent, `SUBAGENTS` uses the canonical
`SOLO`/sequential fallback.

## Invocation

```text
/swe-forge <ticket>             # PR + automatic topology
/swe-forge guided <ticket>      # guided checkpoints
```

`SOLO` and `SUBAGENTS` are selected internally after ticket and repository
inspection.

The template runs only for an explicit `/swe-forge` prompt and passes
`$ARGUMENTS` unchanged. The runtime invokes the shared parser once and injects
normalized facts; the canonical workflow owns status handling. Delivery prompts
load the canonical delivery policy. `/git-pr draft` is explicit; plain
`/git-pr` remains normal/open.

## Runtime boundary

The extension:

- probes the parser and optional native subagent capability at the explicit
  invocation boundary;
- reads only the bounded canonical continuation projection;
- refreshes that projection through Pi's `before_agent_start` and its host lifecycle hooks;
- maps exact active-PR `merged` shorthand to `/git-sync merged`; and
- passes the root-rendered, validated worker briefing unchanged in
  `workerBriefing`.

It does not choose topology, reconstruct canonical state, or import/install the
optional worker package. It gates native workers to canonical `SUBAGENTS`,
checks their role/profile/result, and leaves returned data to normal root
acceptance. A host-private worker environment is not Forge state or result
metadata; writable results are materialized and validated in the canonical
delivery checkout.

The host decides context preservation, compaction, retry, restoration, worker
physical execution, and scheduling. After a lifecycle discontinuity, the
canonical workflow re-reads state and Git/evidence. A first capability probe may
occur before a state snapshot; it is discovery only. Missing, stale, or
incompatible capability/state uses the visible `SOLO`/sequential fallback.

## References

The adapter was checked against Pi 0.84.2 documentation and types on
2026-08-15:

- https://pi.dev/docs/latest/extensions
- https://pi.dev/docs/latest/prompt-templates
