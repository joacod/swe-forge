# Context Continuity and Compaction Policy

## Objective

Keep long-running tickets, especially `PR` runs, coherent when the active model
context becomes large. Context compaction is a harness lifecycle operation,
not a substitute for Git checkpoints, the working spec, validation evidence, or
durable run state.

Conversation summaries are useful orientation but are lossy. Workflow-control
state must be persisted separately and re-read after every compaction or
overflow recovery.

## Portable capability boundary

There is no universal cross-harness API for context usage, context-window
limits, compaction, or overflow classification. A model name, provider name,
or installed harness is not evidence of any of those capabilities. The
orchestrator records what the active adapter or runtime actually exposes:

```yaml
context_capabilities:
  usage_telemetry: exact | estimated | unavailable
  context_window: reported | configured | unknown
  proactive_compaction: native | extension | manual | unavailable
  compaction_hooks: available | unavailable | unknown
  state_reinjection: available | unavailable | unknown
  overflow_recovery: automatic_retry | automatic_compaction | manual | unavailable
  persistent_session: durable | ephemeral | unknown
```

Capability precedence is `observed runtime evidence`, then
`adapter-declared capability`, then a documented static default, then
`unknown`. An unknown value must not be upgraded by assumption. Adapters may
translate host-specific signals into these generic fields, but the core must
not call a vendor method or invent a common command.

## Durable continuation state

The run state is the authoritative workflow-control record. It should contain a
small `continuation` section whenever a run is active:

```yaml
continuation:
  workflow_active: true
  workflow: ticket
  phase: implementation | review | delivery | awaiting_merge
  step: 3
  awaiting: none | user_merge | user_decision | recovery
  next_action:
    kind: implement | validate | review | verify_and_sync_merge | recover
    target: <short target>
    acceptance: [<short checks>]
    expected_context_tokens: <number or unknown>
  safe_boundary: true | false
  updated_at: <UTC timestamp>
  recovery:
    host_signal: none | near-limit | overflow | compaction
    status: none | pending | recovered | blocked
```

For PR delivery, the continuation may also record `delivery.mode`,
`delivery.pr_number`, and `delivery.pr_state`. The state records the active
workflow, phase, next action, delivery mode, and pending shorthand without
copying the original ticket or conversation. `workflow_active: false` is the
explicit terminal marker.

When a newer state snapshot exists, it wins by its recorded `updated_at` (with
file modification time as a conservative fallback). A state snapshot whose
workflow is terminal, whose checkout does not match the active project, or
whose active marker is false is not eligible for reinjection. A pointer to a
stale state must never override a newer active snapshot.

Pi and other adapters may derive a bounded continuity block from this section.
The block is a reminder, not a second workflow specification. It must be
small, deterministic, and per-turn or otherwise non-duplicating; it must not
reinject the ticket, transcript, or full policy.

## Context states

Record the latest observed state in run state and the transient working spec:

- `healthy`: enough headroom exists for the next bounded action;
- `near-limit`: the host reports that the next response or planned slice may
  exceed its safe budget;
- `overflow`: a provider or harness rejected or truncated a request because of
  context size;
- `compacting`: the host is currently summarizing; no new Forge action should
  race it;
- `recovered`: compaction or host recovery completed and state was rechecked;
- `unknown`: no reliable signal is available; durable checkpoints are the
  protection, not a guessed token threshold; and
- `blocked`: recovery cannot be performed safely with the available host
  capability.

## Safe-boundary proactive protocol

At a meaningful boundary—after a validated logical step, before the next PR
commit-plan step, between dependency waves, after discovery, before review, or
at the host's fully settled lifecycle event—use this sequence:

1. Finish or classify the current atomic operation. Do not interrupt a write,
   commit, validation command, or provider retry.
2. Validate the completed step and persist the short working spec/run state,
   including exact Git `HEAD`, dirty/staged/untracked state, completed
   acceptance items, the next action, `safe_boundary`, and any expected context
   need.
3. Inspect context usage only when the active profile provides it. Prefer a
   remaining-budget signal and the next action's expected context need over a
   universal percentage. A documented host reserve may be used as a
   host-specific fallback, never as a cross-harness rule.
4. If the state is at a safe boundary and the next bounded action would not
   have sufficient headroom, request harness-native or adapter-provided
   compaction. Do not compact merely because the ticket or prompt is large.
5. Wait for the host compaction lifecycle to settle. Do not launch a duplicate
   retry or continue while `compacting`.
6. Re-read the working spec and run state, inspect the actual checkout and
   current `HEAD`, and verify the expected branch, diff boundary, and evidence
   are still present.
7. Resume only from the recorded next action. A changed context estimate may
   justify a deliberate routing revision at this boundary, recorded in
   `routing.revisions`.

A runtime extension may provide steps 3–5, but the core workflow remains
responsible for persistence and the post-compaction recheck. If a host exposes
only a settled event but no compaction API, record the observed signal and use
its native/manual path. If it exposes neither, use durable checkpoints and
manual resume; do not claim proactive recovery.

## Pi lifecycle mapping

The Pi adapter keeps Pi-specific API knowledge local to its extension:

- `before_agent_start` appends a bounded state-derived system-prompt reminder;
- `agent_settled`, not merely `agent_end`, is the preferred safe lifecycle
  boundary because Pi may still retry, compact-and-retry, or process queued
  follow-ups after `agent_end`;
- `ctx.getContextUsage()` supplies observed usage when available;
- `ctx.compact()` requests programmatic compaction without changing the
  generic core; and
- `session_before_compact`/`session_compact` observe the host lifecycle so the
  extension does not race or duplicate an automatic compaction.

The Pi extension must not replace the host's own threshold compaction or
overflow retry. It may request one proactive compaction at a recorded safe
boundary, then waits for the host callback/event and relies on the next
`before_agent_start` to re-read and reinject state.

## Pre-continuation protocol

When the state is `near-limit`, or when the host provides an equivalent
reliable signal, the orchestrator must do this before continuing to another
slice, wave, review, or delivery action:

1. Stop at the nearest safe boundary. Finish or classify the current atomic
   tool operation first; do not begin another mutation while compaction may
   run.
2. Persist the external working spec and run state with the current phase,
   exact Git `HEAD`, dirty/staged/untracked state, completed acceptance items,
   validation evidence, `safe_boundary`, and one explicit next action.
3. Invoke the harness-native or adapter-provided compaction mechanism and wait
   for it to settle.
4. Re-read the working spec and run state, inspect the actual checkout and
   current `HEAD`, and confirm that the expected branch and diff boundary are
   still present.
5. Resume only from the recorded next action. Do not repeat a write, commit,
   validation command, or delivery action merely because the compacted summary
   does not mention it.

If the host cannot compact automatically, stop and request its manual compact
command or a fresh session. In `PR` mode this is a context-recovery blocker,
not permission to continue with an unverified or improvised summary.

## Overflow protocol

If a provider reports `overflow` during a turn:

1. Treat the failed response as a recovery event, not as a completed task or a
   reason to launch a duplicate Forge retry.
2. If the host documents automatic compact-and-retry, wait for that lifecycle
   to settle. Provider retry state is not Forge task state.
3. Verify that compaction/recovery actually occurred, then re-read durable
   state and inspect Git before interpreting the retried response.
4. If automatic recovery is absent, failed, or cannot be distinguished from a
   normal model error, persist state and stop at `blocked` until the user or
   host performs a safe compact/resume action.
5. After one failed recovery attempt, do not loop. Reduce the next action to a
   bounded unit, use a host with demonstrated capacity, or report the blocker.

A successful host retry does not prove that the workflow remembered the
original plan. Durable state and current Git/evidence inspection remain
required.

## PR cadence and adaptive routing

`PR` commit-plan steps are natural context boundaries. Before beginning each
step, and after each validated step commit, refresh the short working spec and
run-state checkpoint. If the host reports `near-limit` at either boundary,
compact before starting the next step. A one-step ticket still gets one
cohesive commit; do not create ceremonial commits just to force compaction.

After compaction, routing may be reconsidered once at the next meaningful
boundary. `SOLO -> SUBAGENTS` and `SUBAGENTS -> SOLO` are valid when the
context-value evidence changes. A move toward `ISOLATED` reruns writable
eligibility and provider proof. Record the preferred/effective distinction and
revision rather than silently changing the topology.

Fresh review and delivery must use the post-compaction, post-validation
`HEAD`. A review or receipt created before recovery is stale when the candidate
or working state changed.

## Evidence and reporting

Record context evidence separately from validation results:

- capability source and whether the signal was exact, estimated, or unknown;
- context state at each recovery boundary;
- compaction or overflow event reference, if one occurred;
- the durable-state and Git recheck performed before resuming;
- preferred versus effective topology and any revision caused by pressure; and
- any unavailable capability or residual risk.

Do not claim that a harness compacted, retried, or recovered unless its event,
status, session entry, or equivalent evidence was observed. A ticket that
never approached a limit may report `healthy` or `not-observed`; it does not
need an artificial compaction.
