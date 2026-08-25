# OMP Adapter

OMP (Oh My Pi) is an experimental SWE Forge adapter. It exposes the
canonical workflow through OMP's user-level prompt-template and runtime
extension conventions while keeping routing, worker briefs, result contracts,
review, Git integration, and delivery in the canonical SWE Forge support tree.

The adapter targets the observed OMP `18.0.4` task API and remains a small
control-plane integration layer. It does not replace OMP's native task
executor or change the OMP support tier.

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

The runtime extension is discovered from OMP's native
`~/.omp/agent/extensions/` directory. The three agent definitions contain only
host-level tool, recursion, and blocking settings; canonical role instructions
and result semantics are supplied by the worker briefing and canonical
contracts. The installer does not modify OMP settings, providers, models,
credentials, permissions, or project configuration.

The canonical support links are resolved from the active user-level OMP agent
directory, including `PI_CODING_AGENT_DIR`/OMP profiles. They are never
resolved against a project-local `.swe-forge` tree.

## Explicit invocation

After installation, restart OMP and invoke:

```text
/swe-forge <ticket>
/swe-forge pr <ticket>
```

The normal OMP experience uses the canonical ticket entry point. Canonical
routing decides whether `SUBAGENTS` is useful; when it selects that topology
and the adapter observes a compatible native backend, this adapter realizes
the decision through OMP's native task mechanism. The global canonical
`solo`, `subagents`, and `isolated` overrides remain available for explicit
routing and testing, but they are not OMP-specific workflows.

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
- the installed user-level confined profiles;
- the canonical brief, result, and state validators.

It advertises the capability only when those observations are compatible. The
canonical router still decides whether the effective topology is `SUBAGENTS`.
A task tool's mere presence does not change routing.

When canonical routing has persisted `routing.current: SUBAGENTS`, the bridge:

1. validates the active schema-v3, checkout-matching run state with the
   canonical state tool;
2. validates each `worker_briefing/v1` projection with
   `swe-forge-worker-brief`;
3. passes that exact rendered projection as the native OMP task assignment;
4. selects the adapter-owned `swe-forge-*` host profile;
5. supplies the translated canonical result JSON Schema with
   `schemaMode: strict`; and
6. validates returned ordinary results with
   `swe-forge-worker-result` before marking the delegation successful.

The extension uses OMP's `tool_call` input-revision and `tool_result`
middleware around the native task tool. It does not implement child sessions,
background jobs, task batching, structured-output execution, or task
lifecycle management itself.

### Profiles and approvals

The profiles map native OMP tools as follows:

| Profile | OMP tools | Result contract |
| --- | --- | --- |
| `swe-forge-read-only` | `read`, `grep`, `glob` (plus OMP's required `yield`) | `READ_ONLY` |
| `swe-forge-writable` | `read`, `grep`, `glob`, `edit`, `write`, `bash` (plus `yield`) | `WRITABLE` |
| `swe-forge-reviewer` | `read`, `grep`, `glob` (plus `yield`) | `REVIEW` |

Every profile sets `spawns: []` and `blocking: true`. This prevents recursive
SWE Forge task delegation through the profile and makes the native result
available to the bridge before validation. OMP delegated sessions are
headless and run with OMP's `yolo` approval mode; an interactive approval
prompt is not a safety boundary. Safety comes from the bounded canonical
brief, the selected profile, no task recursion, and root-owned canonical
delivery authorization. OMP approval defaults are never interpreted as SWE
Forge delivery permission.

### Structured results

The bridge translates the canonical `READ_ONLY` and `WRITABLE` result fields to
per-task JSON Schema and always requests `schemaMode: strict`. The native
`structuredOutput` must be a strict valid result. The adapter then serializes
its semantic fields to the canonical line-oriented result representation and
runs the canonical validator. Invalid, missing, non-strict, or incompatible
worker data is returned as a failed delegation result and remains untrusted.

Reviewers receive a strict structured shape for the canonical review contract;
the root still owns the complete review contract and blocking matrix.

## Shared-checkout safety and fallback

- Independent read-only workers may run in one native `task.batch` when the
  canonical routing policy permits a read-only fan-out/fan-in batch.
- More than one writable item in a native batch is rejected. Shared-checkout
  writable workers are always launched one at a time, even when their file
  scopes look disjoint.
- Native OMP task isolation is deliberately **not** advertised as SWE Forge
  `ISOLATED`. OMP's isolated workspace/patch behavior does not prove SWE
  Forge's exact baseline, integration, evidence, and delivery ownership
  requirements. Native OMP `ISOLATED` remains unsupported in this step.
- Missing, inactive, shadowed, malformed, stale, obsolete-schema, fenced, or
  wrong-checkout capability/state causes a visible refusal and the existing
  canonical `SOLO`/sequential fallback. A worker prompt cannot establish
  routing authority.
- If a canonical validator or required profile is unavailable, the bridge
  never pretends that native delegation succeeded.

## Lifecycle scope

The adapter implements delegation, capability observation, state gating, and
structured-result validation. It does not currently implement OMP context
telemetry, SWE Forge state reinjection, proactive compaction, or task lifecycle
state synchronization. Those capabilities remain unknown/unavailable to the
canonical workflow and use the durable-checkpoint/manual-recovery behavior.

## Current API references and validation boundary

The implementation follows the current OMP documentation and source for:

- [prompt templates](https://omp.sh/docs/prompt-templates)
- [extension loading](https://omp.sh/docs/extension-authoring)
- [task/subagent execution](https://omp.sh/docs/subagents)
- [task tool details](https://omp.sh/docs/tools/task)
- [agent discovery and profiles](https://omp.sh/docs/subagent-authoring)
- [tool approvals](https://omp.sh/docs/approvals)
- [extension hooks](https://omp.sh/docs/hooks)
- [settings and task isolation](https://omp.sh/docs/settings)

The observed local OMP CLI is `18.0.4`. Installer, profile, runtime-fixture,
and canonical regression checks are covered locally. This step does not claim
an end-to-end native worker run or promote OMP beyond its Experimental tier;
real-harness validation remains a separate step.
