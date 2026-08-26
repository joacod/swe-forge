# OMP Adapter

OMP is an experimental adapter using its user-level prompt, profile, and
runtime-extension surfaces. It translates canonical worker briefs and results;
it does not replace OMP's native task executor or choose topology.

## Installation

```bash
scripts/swe-forge install omp
scripts/swe-forge verify omp
```

The installer links the prompt, runtime extension, three confined agent
profiles, and canonical support under `~/.omp/agent/`. It does not change OMP
settings, models, credentials, permissions, or project configuration.

## Invocation and capability

```text
/swe-forge <ticket>
/swe-forge guided <ticket>
```

The prompt passes `$ARGUMENTS` unchanged; the shared invocation parser owns
the `guided` delivery modifier and leaves topology selection to the canonical
workflow. Ordinary prompts do not activate the bridge.

For an explicit invocation, the extension observes the native `task` tool,
batch shape, per-item `outputSchema`/`schemaMode`, source, confined
profiles, and canonical validators. Presence alone is not capability. When
canonical routing selects `SUBAGENTS`, it:

1. resolves active state through `swe-forge-state`;
2. re-observes capability at the delegation boundary;
3. inspects each `worker_briefing/v1` and its task ID;
4. passes the unchanged projection to the native task;
5. maps profile/write facts to the confined OMP profile; and
6. requests the canonical result schema with `schemaMode: strict`, then uses
   canonical encode/validation.

The extension uses OMP middleware around the native task tool; it does not
implement child sessions, scheduling, or task lifecycle. Read-only tasks may
form one logical batch; OMP decides whether ready items run concurrently or
sequentially. More than one writable item is rejected because canonical
materialization and acceptance are sequential.

| Profile | Tools | Result |
| --- | --- | --- |
| `swe-forge-read-only` | `read`, `grep`, `glob`, `yield` | `READ_ONLY` |
| `swe-forge-writable` | read tools plus `edit`, `write`, `bash`, `yield` | `WRITABLE` |
| `swe-forge-reviewer` | `read`, `grep`, `glob`, `yield` | `REVIEW` |

Profiles set `spawns: []` and `blocking: true`. Review and repair use the
canonical review/brief contracts; the adapter adds no ticket or policy prose.

## Boundaries and evidence

Writable results are materialized and validated in the canonical delivery
checkout. Private worktrees, sandboxes, overlays, and containers are host
details, never Forge state. Missing, inactive, stale, obsolete, or
incompatible capability/state uses visible `SOLO`/sequential fallback. The
adapter does not implement context preservation, compaction, retry, or
restoration.

References:

- https://omp.sh/docs/prompt-templates
- https://omp.sh/docs/extension-authoring
- https://omp.sh/docs/subagents
- https://omp.sh/docs/tools/task
- https://omp.sh/docs/subagent-authoring
- https://omp.sh/docs/approvals
- https://omp.sh/docs/hooks

The observed local OMP CLI is `18.0.4`; projection and runtime checks are
adapter evidence, not a change to its Experimental tier.
