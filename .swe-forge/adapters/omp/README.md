# OMP Adapter

OMP (Oh My Pi) is an experimental SWE Forge adapter. It exposes the canonical
workflow through OMP's user-level prompt-template and runtime extension
conventions while keeping routing, worker briefs, result contracts, review, Git
integration, and delivery in the canonical SWE Forge support tree.

The adapter targets the observed OMP `18.0.4` task API and remains a small
control-plane integration layer. It does not replace OMP's native task executor
or change the OMP support tier.

## Installation

Install the source-linked bridge explicitly:

```bash
scripts/swe-forge install omp
scripts/swe-forge verify omp
```

The installer links these user-level artifacts:

```text
~/.omp/agent/prompts/swe-forge.md
~/.omp/agent/extensions/swe-forge-runtime.ts
~/.omp/agent/agents/swe-forge-read-only.md
~/.omp/agent/agents/swe-forge-writable.md
~/.omp/agent/agents/swe-forge-reviewer.md
~/.omp/agent/swe-forge/
```

The three agent definitions contain only host-level tool, recursion, and
blocking settings; canonical role instructions and result semantics are
supplied by the worker briefing and canonical contracts. The installer does
not modify OMP settings, models, credentials, permissions, or project
configuration.

Canonical support links resolve from the active user-level OMP agent directory,
including `PI_CODING_AGENT_DIR`/OMP profiles. They are never resolved against a
project-local `.swe-forge` tree.

## Explicit invocation

After installation, restart OMP and invoke:

```text
/swe-forge <ticket>
/swe-forge pr <ticket>
```

Canonical routing decides whether `SUBAGENTS` is useful. When it selects that
topology and the adapter observes a compatible native capability, this adapter
realizes the decision through OMP's native task mechanism. Otherwise it falls
back visibly to `SOLO` or sequential root execution.

The prompt template passes `$ARGUMENTS` unchanged to the canonical invocation
bootstrap. The shared `swe-forge-invocation` tool remains responsible for
parsing reserved tokens exactly once. Ordinary OMP prompts do not activate the
runtime bridge.

## Native `SUBAGENTS` bridge

For an explicit SWE Forge invocation, the runtime extension observes OMP's
current public surfaces:

- the active native `task` tool and its batch shape;
- per-item `outputSchema` and `schemaMode` support;
- the source of the active task tool;
- the installed user-level confined profiles; and
- the canonical brief, result, and state validators.

It advertises the capability only when those observations are compatible. A
task tool's mere presence does not change routing, and capability observations
are not trusted as durable authorization.

When canonical routing has persisted `routing.current: SUBAGENTS`, the bridge:

1. resolves active state candidates through the canonical
   `swe-forge-state resolve-active` port;
2. re-observes the native capability at the delegation boundary;
3. inspects each `worker_briefing/v1` projection with
   `swe-forge-worker-brief inspect` and checks its canonical task ID;
4. passes the exact rendered projection as the native OMP task assignment;
5. maps the inspected profile and write-access facts to the adapter-owned
   `swe-forge-*` host profile;
6. requests the canonical worker-result JSON Schema with `schemaMode: strict`;
   and
7. passes ordinary structured output through canonical `encode` and
   `validate` before marking delegation successful.

The extension uses OMP's `tool_call` input-revision and `tool_result` middleware
around the native task tool. It does not implement child sessions, background
jobs, structured-output execution, or task lifecycle management itself.

### Profiles and approvals

| Profile | OMP tools | Result contract |
| --- | --- | --- |
| `swe-forge-read-only` | `read`, `grep`, `glob` plus OMP's required `yield` | `READ_ONLY` |
| `swe-forge-writable` | `read`, `grep`, `glob`, `edit`, `write`, `bash` plus `yield` | `WRITABLE` |
| `swe-forge-reviewer` | `read`, `grep`, `glob` plus `yield` | `REVIEW` |

Every profile sets `spawns: []` and `blocking: true`. This prevents recursive
SWE Forge delegation through the profile and makes the native result available
to the bridge before validation. Headless sessions have no interactive
approval boundary; safety comes from the bounded canonical brief, selected
profile, no recursion, sequential writable execution, and root-owned delivery
authorization.

### Structured results
The bridge requests the canonical `READ_ONLY` and `WRITABLE` JSON-Schema
projections and always requests `schemaMode: strict`. The native
`structuredOutput` must be a strict valid result. The adapter writes that JSON
to a temporary input and invokes canonical `encode`, then the existing
canonical validator. It does not reconstruct the schema or line-oriented
representation locally. Invalid, missing, non-strict, or incompatible worker
data remains untrusted.

Reviewers receive the canonical REVIEW transport schema; the root still owns
the complete review contract, semantic acceptance, and blocking matrix.

## Shared-checkout safety and fallback

- independent read-only workers may run in one native `task.batch` when the
  routing policy permits a read-only fan-out/fan-in batch;
- more than one writable item in a native batch is rejected;
- writable delegated tasks are always launched one at a time, even when their
  file scopes look disjoint;
- missing, inactive, shadowed, malformed, stale, obsolete-schema, fenced, or
  wrong-checkout capability/state causes a visible refusal and the canonical
  `SOLO`/sequential fallback; and
- a worker prompt cannot establish routing authority.

## Lifecycle scope

The adapter implements delegation, capability observation, state gating, and
structured-result validation. It does not implement host context preservation,
compaction, retry, or restoration. Those lifecycle mechanics remain private to
OMP and its runtime. When a run resumes, the canonical workflow re-reads the
authoritative continuation state and reconciles it with the checkout and
evidence before continuing.

## Current API references and validation boundary

The implementation follows current OMP documentation and source for:

- [prompt templates](https://omp.sh/docs/prompt-templates);
- [extension loading](https://omp.sh/docs/extension-authoring);
- [task/subagent execution](https://omp.sh/docs/subagents);
- [task tool details](https://omp.sh/docs/tools/task);
- [agent discovery and profiles](https://omp.sh/docs/subagent-authoring);
- [tool approvals](https://omp.sh/docs/approvals); and
- [extension hooks](https://omp.sh/docs/hooks).

The observed local OMP CLI is `18.0.4`. Installer, profile, runtime-fixture,
and canonical regression checks are covered locally. These checks demonstrate
adapter behavior but do not change the Experimental support tier.

## Demonstrated native validation

On 2026-08-25, validation ran inside real OMP `18.0.4` through the normal
automatic SWE Forge prompt path. The invocation used the `pr` delivery token.
The canonical run state recorded:

```text
requested_mode: AUTO
routing.preferred/current: SUBAGENTS
```

The root session recorded `native_task_prepared` for one two-item read-only
batch and `native_task_validated` for two results. Native task results contained
strict structured output, and the adapter recorded canonical
`swe-forge-worker-result` validation. The validated assignments were canonical
`worker_briefing/v1` projections unchanged.

The same run exercised single-checkout writable safety against a temporary Git
repository: one native `WRITABLE` worker created one untracked marker and
returned required Git/change/validation evidence; a two-item writable native
batch was refused because shared-checkout writers must run sequentially. A
controlled malformed-result fixture was rejected rather than accepted as
prose. A fresh OMP process with the native `task` tool disabled reported that
the capability was unavailable, retained preferred `SUBAGENTS`, and used
sequential fallback.
