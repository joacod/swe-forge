# Context-Aware Execution Routing Policy

## Objective

Choose the smallest topology that provides a meaningful reliability benefit,
context headroom, and appropriate isolation. Topology, delegation backend,
provider, and delivery remain separate decisions. `NATIVE` and `HERDR` are
backend/provider identities, never topologies.

## Routing record

Every automatic or explicit run records the following fields. Existing
`execution_mode` is the effective selected/current semantic topology; it is not
a provider name.

```text
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
preferred_mode: SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
delegation_backend: NONE | NATIVE | HERDR | OTHER
write_isolation: SHARED | WORKTREE
provider_reason: <why the selected isolated provider is safe, or non-isolated>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence>
fallback_used: no | <preferred/requested -> effective selection and reason>

routing:
  initial: SOLO | SUBAGENTS | ISOLATED
  preferred: SOLO | SUBAGENTS | ISOLATED
  selected: SOLO | SUBAGENTS | ISOLATED
  current: SOLO | SUBAGENTS | ISOLATED
  revisions:
    - from: SOLO | SUBAGENTS | ISOLATED
      to: SOLO | SUBAGENTS | ISOLATED
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

`preferred_mode` answers what the policy would choose with the observed
capabilities. `execution_mode`/`routing.current` answers what the active
runtime can actually execute. A preferred `SUBAGENTS` result with no backend
is recorded as `preferred_mode: SUBAGENTS`, `execution_mode: SOLO`,
`delegation_backend: NONE`, with the fallback reason; it is not silently
reported as successful delegation.

`execution_provider` retains its existing narrow meaning: it is the lifecycle
provider for an `ISOLATED` writable plan and must be `NONE` for non-isolated
runs. `delegation_backend` may be `NATIVE` or `HERDR` for read-only
`SUBAGENTS` work without changing the topology to `ISOLATED`.

## Context value and reducibility

Do not route from ticket size, prompt length, token count, or file count alone.
First estimate the information generated during the work and what the root
agent must retain to make the next correct decision:

- `projected_pressure`: likely growth from discovery, tool output, tests,
  review, delivery, and user interaction, not the original prompt size;
- `context_reducibility`: how much of that growth can leave the root as concise
  structured evidence rather than raw exploration;
- `delegatable_context`: the amount of independently evaluable investigation
  or bounded work that can be delegated;
- `root_context_requirement`: how much global state must remain together for
  safe implementation and integration;
- `continuity_risk`: the cost of losing workflow state or coordination context
  during a long run.

A large ticket with high root-context requirement and low reducibility remains
`SOLO`. Independent investigations into different subsystems, test
conventions, or compatibility boundaries may make `SUBAGENTS` preferable even
when all implementation writes remain sequential. Delegation is justified only
when the returned evidence is concise, independently checkable, and materially
reduces root growth after coordination overhead is included.

## Decision procedure

1. Record the root-context requirement, independent evaluability, projected
   pressure, reducibility, continuity risk, and available runtime profile.
2. Prefer `SOLO` when the work is tightly coupled, global context is required,
   delegation would return little useful compression, or coordination costs
   exceed the expected relief.
3. Prefer `SUBAGENTS` when at least one bounded read-only investigation or
   sequentially consumable task is independently evaluable and delegation
   materially reduces root-context growth. Native workers are preferred when
   they are actually available; a verified external backend may also realize
   read-only workers.
4. Consider `ISOLATED` only when concurrent writable work has meaningful
   critical-path value and every hard eligibility condition below passes.
   High context pressure alone never selects `ISOLATED`.
5. Resolve capability fallbacks after the semantic preference. If the preferred
   topology cannot be executed safely, retain the preference in state and use
   the smallest safe effective topology, normally `SOLO` or sequential
   `SUBAGENTS`.
6. Record the rationale in structured state rather than adding a score or
   pretending that a token threshold is a routing proof.

## Adaptive routing

The initial choice is not immutable. Reconsider it at deliberate boundaries:

- after repository discovery;
- after a validated implementation step or PR commit-plan step;
- before a new large implementation phase;
- after compaction/recovery;
- between commit-plan steps; and
- before review or when context pressure materially changes.

A revision requires new evidence that changes context reducibility,
root-context requirement, coordination cost, runtime capability, or continuity
risk. Record `from`, `to`, `reason`, `phase`, and the safe `boundary` in
`routing.revisions`. Do not churn on every turn: at most one revision per
logical phase is the default unless a new host recovery or safety signal
changes the decision.

The supported adaptive transitions are:

- `SOLO -> SUBAGENTS` when independent work remains and delegation now gives
  meaningful context relief;
- `SUBAGENTS -> SOLO` when results are consumed, remaining work is globally
  coupled, or coordination no longer pays for itself; and
- a transition toward `ISOLATED` only after rerunning the complete writable
  isolation gate and provider capability proof.

After compaction, re-read durable state and Git before applying a revision. A
conversation summary cannot establish that a prior topology or delivery phase
is still active.

## Runtime capability profiles

The core reasons about capabilities, not harness method names. A profile may
be recorded in the working spec or run state using this shape:

```yaml
runtime_profile:
  harness: pi
  context_usage:
    status: available | estimated | unavailable | unknown
    source: <observed adapter/runtime evidence>
  context_window: reported | configured | unknown
  proactive_compaction: available | unavailable | unknown
  compaction_hooks: available | unavailable | unknown
  state_reinjection: available | unavailable | unknown
  subagents:
    native: available | unavailable | unknown
    external: [HERDR]
  capability_precedence: observed > adapter_declared > static_default > unknown
```

Use capability precedence deliberately: observed runtime evidence outranks an
adapter declaration; an adapter declaration outranks a static default; an
unknown value never becomes `available` merely because a harness is installed.
A host may expose usage telemetry without exposing subagents or compaction.
Record each capability independently. Model identifiers, provider selection for
model calls, price, and reasoning level are not routing capabilities in this
profile and must not be used to choose work.

## Hard isolated eligibility

An explicit isolated request cannot bypass this gate. Every condition must be
satisfied before multiple writable workers are created:

1. at least two composable writable tasks;
2. dependencies satisfied before the parallel wave;
3. non-overlapping writable ownership;
4. one owner for shared and generated artifacts;
5. stable shared foundation;
6. independently observable acceptance criteria;
7. realistic worker-level validation;
8. safely isolated runtime resources; and
9. one accountable central integrator.

If a hard condition fails, downgrade to `SUBAGENTS` or `SOLO` when safe, or
return `BLOCKED` when required isolation would be lost. Do not manufacture
parallel writers merely to demonstrate isolated execution.

## Economic preference

Automatic routing additionally asks whether parallelism credibly reduces
critical-path time or context interference. Record `beneficial`, `marginal`,
or `unknown` and the evidence. Context reducibility may make read-only
`SUBAGENTS` beneficial even when writable parallelism is not. An explicit
isolated request may override only this economic judgment; it may not override
hard eligibility.

```yaml
parallel_value:
  status: beneficial | marginal | unknown
  rationale: <critical-path or context-interference evidence>
  overridden_by_user: true | false
```

## Topologies and backend mapping

### `SOLO`

One context owns discovery, implementation, validation, and acceptance. Use it
for small, tightly coupled, sequential, or shared-surface work and whenever
there is no meaningful context reduction to buy.

### `SUBAGENTS`

Use bounded native or external workers for independent read-only research,
concise evidence gathering, or sequentially consumable tasks. Writes remain
sequential in one checkout unless dedicated worktrees make the semantic
selection `ISOLATED`. The orchestrator retains task ownership, integration,
and acceptance. If no backend is available, record the preferred topology and
fall back safely rather than simulating workers with unrelated processes.

A read-only Herdr worker is represented as:

```yaml
topology: SUBAGENTS
delegation_backend: HERDR
write_isolation: SHARED
execution_provider: NONE
```

### `ISOLATED`

Use only for proven concurrent writable worktrees. The semantic topology is
independent from whether `NATIVE` or `HERDR` supplies the lifecycle. The
isolated workflow owns waves, worktrees, central integration, recovery, and
cleanup; the orchestrator remains accountable for one integration/delivery
branch and one final PR.

A writable Herdr plan is represented as:

```yaml
topology: ISOLATED
delegation_backend: HERDR
execution_provider: HERDR
write_isolation: WORKTREE
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
```

Provider selection and its mandatory proof are loaded only after this semantic
selection. Herdr is never implied by the word `ISOLATED`, and `ISOLATED` is
never implied by the presence of Herdr.

## Safe fallback

When subagents are unavailable, use sequential work or `SOLO` and record:

```text
preferred topology: SUBAGENTS
effective topology: SOLO
reason: delegation backend unavailable
```

When context usage is unavailable, record `unknown` and rely on durable
safe-boundary checkpoints and host-native recovery. Never fabricate an exact
measurement, universal threshold, or successful compaction.
