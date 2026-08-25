# Context-Aware Execution Routing Policy

## Objective

Choose the smallest topology that provides a meaningful reliability benefit,
context headroom, and safe task ownership. Supported topologies are `SOLO` and
`SUBAGENTS`; both use one writable delivery checkout.

## Routing record

Every automatic or explicit run records the following fields. The nested
`routing` mapping is the sole owner of live topology facts. Full field semantics
and update rules are defined in the run-state contract.

```text
requested_mode: AUTO | SOLO | SUBAGENTS
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence>
fallback_used: no | <preferred -> effective selection and reason>

routing:
  initial: SOLO | SUBAGENTS
  preferred: SOLO | SUBAGENTS
  selected: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS
  revisions:
    - from: SOLO | SUBAGENTS
      to: SOLO | SUBAGENTS
      reason: <evidence>
      phase: <workflow phase>
      boundary: <safe boundary>
  context_value:
    projected_pressure: low | medium | high | unknown
    context_reducibility: low | medium | high | unknown
    delegatable_context: low | medium | high | unknown
    root_context_requirement: low | medium | high | unknown
    continuity_risk: low | medium | high | unknown
    rationale: <why generated information can or cannot leave the root>
  runtime_profile_ref: <capability profile or none>
```

`requested_mode` is the immutable invocation request. `routing.initial` is the
initial semantic preference, `routing.preferred` is the current preference
after deliberate reassessment, `routing.selected` is the initial effective
result after capability fallback, and `routing.current` is the currently
effective topology. A preferred `SUBAGENTS` result with no demonstrated native
capability retains that preference while `routing.current` records the safe
`SOLO` fallback with its reason; it is not silently reported as delegation.

## Context value and reducibility

Do not route from ticket size, prompt length, token count, or file count alone.
First estimate the information generated during the work and what the root
agent must retain to make the next correct decision:

- `projected_pressure`: likely growth from discovery, tool output, tests,
  review, delivery, and user interaction, not original prompt size;
- `context_reducibility`: how much growth can leave the root as concise
  structured evidence;
- `delegatable_context`: independently evaluable investigation or bounded work;
- `root_context_requirement`: how much global state must remain together; and
- `continuity_risk`: the cost of losing workflow state or coordination context.

A large ticket with high root-context requirement and low reducibility remains
`SOLO`. Independent investigations may make `SUBAGENTS` preferable when their
concise structured results materially reduce root growth.

## Early discovery-shape assessment

Before broad discovery, assess the *shape* of the questions. This is not the
final topology decision and must not run a second competing router.

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
    max_workers: <bounded worker limit>
    fan_in: ONE_BARRIER | NONE
  capability: available | unavailable | unknown
  final_routing_deferred: true
```

Use `DELEGATED_RESEARCH` only when at least one question is independently
answerable, read-only, safely bounded, and likely to return concise evidence
that materially reduces root-context growth. It must not decide delivery, pass
full history to a worker, permit recursive orchestration, or allow writes. If
native delegation is unavailable, retain the rationale and execute in the root
context rather than simulating workers.

### Discovery batch rule

When discovery contains two or more genuinely independent, context-reducible
questions, launch the useful ready questions as one small bounded
fan-out/fan-in batch. Render one bounded read-only task per question, launch the
batch before consuming a result, then wait at one root-owned fan-in barrier.
Resolve contradictions centrally. Coupled questions remain root-only or
sequential when a real dependency requires it.

## Decision procedure

1. Record root-context requirement, independent evaluability, projected pressure,
   reducibility, continuity risk, and the observed native capability profile.
2. Prefer `SOLO` when work is tightly coupled, global context is required, or
   coordination costs exceed expected relief.
3. Prefer `SUBAGENTS` when at least one bounded read-only investigation or
   sequentially consumable task is independently evaluable and delegation
   materially reduces root-context growth.
4. Resolve native capability fallback after the semantic preference. If the
   preferred topology cannot be executed safely, retain the preference and use
   the smallest safe effective topology, normally `SOLO` or sequential work.
5. Record the rationale in structured state rather than adding a score or
   pretending a token threshold is a routing proof.

## Adaptive routing

Reconsider at deliberate boundaries:

- after repository discovery;
- after a validated implementation or PR step;
- before a new large implementation phase;
- after compaction or recovery;
- between commit-plan steps; and
- before review or when context pressure materially changes.

A revision requires new evidence that changes context reducibility, root-context
requirement, coordination cost, native capability, or continuity risk. Record
`from`, `to`, `reason`, `phase`, and the safe `boundary`. Do not churn on every
turn.

The supported transitions are:

- `SOLO -> SUBAGENTS` when independent work remains and delegation gives
  meaningful context relief; and
- `SUBAGENTS -> SOLO` when results are consumed, remaining work is coupled, or
  coordination no longer pays for itself.

After compaction, re-read durable state and Git before applying a revision. A
conversation summary cannot establish that a topology or delivery phase is
still active.

## Runtime capability profiles

The core reasons about capabilities, not harness method names:

```yaml
runtime_profile:
  harness: <active-harness>
  context_usage:
    status: available | estimated | unavailable | unknown
    source: <observed adapter/runtime evidence>
  context_window: reported | configured | unknown
  proactive_compaction: available | unavailable | unknown
  compaction_hooks: available | unavailable | unknown
  state_reinjection: available | unavailable | unknown
  subagents:
    native: available | unavailable | unknown
  capability_precedence: observed > adapter_declared > static_default > unknown
```

Observed runtime evidence outranks an adapter declaration; an adapter
declaration outranks a static default; unknown never becomes available merely
because a harness is installed. Each capability is recorded independently.

## Topologies

### `SOLO`

One context owns discovery, implementation, validation, and acceptance. Use it
for small, tightly coupled, sequential, or shared-surface work and whenever
there is no meaningful context reduction to buy.

### `SUBAGENTS`

Use demonstrated native workers for independent read-only research, concise
evidence gathering, or sequentially consumable bounded work. Read-only tasks
may use one bounded fan-out/fan-in batch. Writable delegated work is always
sequential in the single delivery checkout. The root retains task ownership,
validation, integration, review, and acceptance.

## Safe fallback

When the native subagent capability is unavailable, use sequential work or
`SOLO` and record:

```text
preferred topology: SUBAGENTS
effective topology: SOLO
reason: native delegation capability unavailable
```

When context usage is unavailable, record `unknown` and rely on durable
safe-boundary checkpoints and host-native recovery. Never fabricate an exact
measurement, universal threshold, or successful compaction.
