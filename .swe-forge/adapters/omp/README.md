# OMP Adapter

OMP is an experimental adapter using user-level prompts, profiles, and a
runtime extension. It forwards canonical briefs/results and does not replace
the native task executor or choose topology.

## Installation

```bash
scripts/swe-forge install omp
scripts/swe-forge verify omp
```

The installer links the prompt, runtime extension, three confined profiles, and
canonical support under `~/.omp/agent/`. It does not change OMP settings,
models, credentials, permissions, or project configuration.

## Invocation and capability

```text
/swe-forge <ticket>
/swe-forge guided <ticket>
```

The prompt passes `$ARGUMENTS` unchanged; the shared parser owns `guided` and
the canonical workflow owns routing. Ordinary prompts do not activate Forge.

At explicit invocation, the extension observes native `task`, batch shape,
per-item `outputSchema`/`schemaMode`, source, confined profiles, and canonical
validators. Presence is not capability. When routing selects `SUBAGENTS`, it:

1. resolves active state;
2. re-observes capability at delegation;
3. validates and inspects each canonical JSON brief and task ID;
4. passes the unchanged brief to `task`;
5. maps profile/write facts to the confined OMP profile; and
6. requests strict canonical result JSON Schema and validates returned JSON.

The extension uses middleware around `task`; it does not implement child
sessions, scheduling, or lifecycle. Read-only tasks may form one logical batch;
OMP controls ready-item scheduling. More than one writable item is rejected
because materialization and acceptance are sequential.

| Profile | Tools | Result |
| --- | --- | --- |
| `swe-forge-read-only` | `read`, `grep`, `glob`, `yield` | `READ_ONLY` |
| `swe-forge-writable` | read tools, `edit`, `write`, `bash`, `yield` | `WRITABLE` |
| `swe-forge-reviewer` | `read`, `grep`, `glob`, `yield` | `REVIEW` |

Profiles set `spawns: []` and `blocking: true`. Review and repair use canonical
contracts; the adapter adds no ticket or policy prose.

## Boundaries and evidence

Materialize and validate writable results in the canonical checkout. Private
worktrees, sandboxes, overlays, and containers are host details. Missing,
inactive, stale, obsolete, or incompatible capability/state uses visible
`SOLO`/sequential fallback. The adapter does not own context preservation,
compaction, retry, or restoration.

References:

- https://omp.sh/docs/prompt-templates
- https://omp.sh/docs/extension-authoring
- https://omp.sh/docs/subagents
- https://omp.sh/docs/tools/task
- https://omp.sh/docs/subagent-authoring
- https://omp.sh/docs/approvals
- https://omp.sh/docs/hooks

Observed local OMP CLI: `18.0.4`. Projection/runtime checks are adapter evidence,
not a support-tier change.
