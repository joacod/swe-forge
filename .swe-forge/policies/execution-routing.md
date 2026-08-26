# Execution Routing Policy

## Objective

Choose the smallest topology that provides a meaningful reliability benefit and
safe task ownership. Supported topologies are `SOLO` and `SUBAGENTS`; both
define one canonical writable delivery candidate, while the host chooses the
worker execution environment and scheduling mechanics.

## Routing record

Every run records only the semantic topology facts needed to resume and explain
the decision. The nested `routing` mapping owns the live topology:

```text
requested_mode: AUTO | SOLO | SUBAGENTS
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence>
fallback_used: no | <preferred -> effective selection and reason>

routing:
  preferred: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS
```

`requested_mode` is the immutable invocation request. A `requested_delivery`
value of `DEFAULT` means no delivery token was supplied and resolves to PR
delivery; `guided` explicitly selects GUIDED, and `pr` remains an explicit
backwards-compatible PR alias. `routing.preferred` is the current semantic
preference after the latest meaningful assessment. `routing.current` is the
currently effective topology authorized to run. When native capability
fallback is required, `preferred: SUBAGENTS` and
`current: SOLO` remain visible with `fallback_used`; delegation is never
reported from preference alone.

Initial preference, initial effective selection, and routing history are
derived or transient. They do not survive as separate durable fields. The
continuation snapshot, task graph, accepted dependency digests, checkout facts,
and concise routing reason provide the recovery evidence that matters.

## Decision evidence

Do not route from ticket size, prompt length, or file count alone.
Assess the work shape and keep the evidence in the transient working spec or
the concise run-state `reason`; this is not a score or a durable dimensions
matrix:

- how much global state the root must retain together;
- whether bounded work is independently evaluable;
- whether concise structured results materially reduce root coordination;
- whether continuity or recovery makes delegation unsafe; and
- whether fresh native capability and one-checkout ownership support delegation.

Large work with high root-coordination requirements and low reducibility remains
`SOLO`. Independent investigations may make `SUBAGENTS` preferable when their
results materially reduce coordination burden.

## Early discovery-shape assessment

The ticket workflow makes the separate early semantic scope decision before
any discovery delegation or final routing. After `PROCEED`, and before broad
discovery, assess the *shape* of the surviving questions. This is not the final
topology decision and must not run a second competing router.

```yaml
discovery_strategy:
  mode: ROOT_ONLY | DELEGATED_RESEARCH
  rationale: <why these discovery questions can or cannot leave root context>
  questions:
    - id: <short identifier>
      objective: <bounded read-only question>
      allowed_scope: [<paths or symbols>]
      evidence_budget: <concise result limit>
      acceptance: <what makes the evidence useful>
  batch:
    strategy: FAN_OUT_FAN_IN | ROOT_ONLY | SEQUENTIAL
    fan_in: ONE_BARRIER | NONE
  capability: available | unavailable | unknown
  final_routing_deferred: true
```

Use `DELEGATED_RESEARCH` only when at least one question is independently
answerable, read-only, safely bounded, and likely to return concise evidence
that materially reduces root coordination. It must not decide delivery, pass
full history to a worker, permit recursive orchestration, or allow writes. If
native delegation is unavailable, retain the rationale and execute in the root
context rather than simulating workers.

### Discovery batch rule

When discovery contains two or more genuinely independent, evidence-reducible
questions, form one small logical fan-out/fan-in batch from the ready questions.
Submit the useful questions together before consuming any result, then wait at
one root-owned fan-in barrier. The host runtime decides whether ready items run
concurrently or sequentially; the batch is a semantic dependency boundary, not
an active-worker count. Resolve contradictions centrally. Coupled questions
remain root-only or sequential when a real dependency requires it.

## Decision procedure

1. After discovery and specification, identify global coupling, independently
   evaluable work, expected coordination relief, and the root acceptance boundary.
2. Prefer `SOLO` unless a bounded task materially benefits from delegation and
   can return concise, independently checkable evidence.
3. If delegation is useful, require a demonstrated semantic native capability
   and compatibility with the single writable delivery checkout.
4. Resolve capability fallback after the semantic preference. Keep
   `preferred: SUBAGENTS` visible when the effective safe choice is `SOLO` or
   sequential root work.
5. Record only `preferred`, `current`, `reason`, and `fallback_used`. Prompt
   length never establishes a routing proof.

## Adaptive routing

Reconsider topology only at a meaningful boundary where evidence may have
changed:

- repository discovery changes decomposition, dependencies, or coupling;
- host recovery completes and the root has re-read state and Git; or
- a new implementation or review phase changes delegation value, capability,
  or acceptance needs.

Routine turns, unchanged validation checkpoints, and ordinary PR slice
boundaries do not trigger ceremonial reassessment. When a decision changes,
update `routing.preferred`, `routing.current`, `reason`, and `fallback_used`
atomically with `swe-forge-state set-routing`; do not append routing history.

The supported transitions are:

- `SOLO -> SUBAGENTS` when independent work remains and delegation gives
  meaningful coordination relief; and
- `SUBAGENTS -> SOLO` when results are consumed, remaining work is coupled, or
  coordination no longer pays for itself.

After a host recovery or context discontinuity, re-read durable state and Git
before applying a routing change. A conversation summary cannot establish that
a topology or delivery phase is still active.

## Native capability observation

Canonical routing consumes the semantic capability `subagents.native` as
`available`, `unavailable`, or `unknown`; it does not depend on harness
identity. Adapters own observation of their host task surface, bounded roles,
structured results, and safe fallback. Observed evidence outranks adapter
declarations; unknown never becomes available by assumption.

Native capability is fresh execution evidence, not durable authorization. An
active state with `routing.current: SUBAGENTS` is necessary but not sufficient:
the adapter must renegotiate capability immediately before delegation.

## Topologies

### `SOLO`

One root execution flow owns discovery, implementation, validation, and
acceptance. Use it for small, tightly coupled, sequential, or shared-surface
work and whenever delegation would not materially reduce coordination.

### `SUBAGENTS`

Use demonstrated native workers for independent read-only research, concise
evidence gathering, or sequentially consumable bounded work. Read-only tasks
may form one bounded logical fan-out/fan-in batch; the host runtime chooses
their execution order. Writable delegated results are materialized into and
accepted sequentially against the single canonical delivery candidate. The
root retains task ownership, validation, integration, review, and acceptance.

## Safe fallback

When the native subagent capability is unavailable, use sequential work or
`SOLO` and record:

```text
preferred topology: SUBAGENTS
effective topology: SOLO
reason: native delegation capability unavailable
```
