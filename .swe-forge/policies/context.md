# Context Continuity and Compaction Policy

## Objective

Keep long-running tickets, especially `PR` runs, coherent when the active model
context becomes large. Context compaction is a harness lifecycle operation, not
a substitute for Git checkpoints, the working spec, validation evidence, or
run state.

Compaction is lossy and can itself require an LLM call. The safe default is to
compact at a completed turn or slice boundary, before starting the next
meaningful continuation, rather than interrupting an in-flight tool operation
or waiting for a provider failure.

## Portable capability boundary

There is no universal cross-harness API for context usage, context-window
limits, compaction, or overflow classification. A model name, provider name,
or installed harness is not evidence of any of those capabilities. The
orchestrator must record what the active adapter or harness actually exposes:

```yaml
context_capabilities:
  usage_telemetry: exact | estimated | unavailable
  context_window: reported | configured | unknown
  proactive_compaction: native | extension | manual | unavailable
  overflow_recovery: automatic_retry | automatic_compaction | manual | unavailable
  persistent_session: durable | ephemeral | unknown
```

Adapters may translate host-specific signals into this capability description,
but they must not invent a common command or silently redefine the workflow.
When a capability is unknown, use the conservative `manual` or `unavailable`
path rather than assuming that the host will recover.

## Context states

Record the latest observed state in run state and the transient working spec:

- `healthy`: enough headroom exists for the next bounded action.
- `near-limit`: the host reports that the next response or planned slice may
  exceed its safe budget.
- `overflow`: a provider or harness rejected or truncated a request because of
  context size.
- `compacting`: the host is currently summarizing; no new Forge action should
  race it.
- `recovered`: compaction or host recovery completed and state was rechecked.
- `unknown`: no reliable signal is available; durable checkpoints are the
  protection, not a guessed token threshold.
- `blocked`: recovery cannot be performed safely with the available host
  capability.

## Pre-continuation protocol

When the state is `near-limit`, or when the host provides an equivalent
reliable signal, the orchestrator must do this before continuing to another
slice, wave, review, or delivery action:

1. Stop at the nearest safe boundary. Finish or classify the current atomic
   tool operation first; do not begin another mutation while compaction may
   run.
2. Persist the external working spec and run state with the current phase,
   exact Git `HEAD`, dirty/staged/untracked state, completed acceptance items,
   validation evidence, and one explicit next action. Keep this snapshot short.
3. Invoke the harness-native or adapter-provided compaction mechanism and wait
   for it to settle. Do not use a fixed percentage when the host exposes a
   better remaining-budget signal.
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
3. Verify that a compaction/recovery actually occurred, then re-read durable
   state and inspect Git before interpreting the retried response.
4. If automatic recovery is absent, failed, or cannot be distinguished from a
   normal model error, persist state and stop at `blocked` until the user or
   host performs a safe compact/resume action.
5. After one failed recovery attempt, do not loop. Reduce the next action to a
   bounded unit, switch to a host/model with demonstrated capacity, or report
   the blocker.

A successful host retry does not prove that the workflow remembered the
original plan. Durable state and current Git/evidence inspection remain
required.

## PR cadence

`PR` commit-plan steps are natural context boundaries. Before beginning each
step, and after each validated step commit, refresh the short working spec and
run-state checkpoint. If the host reports `near-limit` at either boundary,
compact before starting the next step. A one-step ticket still gets one
cohesive commit; do not create ceremonial commits just to force compaction.

Fresh review and delivery must use the post-compaction, post-validation `HEAD`.
A review or receipt created before recovery is stale when the candidate or
working state changed.

## Evidence and reporting

Record context evidence separately from validation results:

- capability source and whether the signal was exact, estimated, or unknown;
- context state at each recovery boundary;
- compaction or overflow event reference, if one occurred;
- the durable-state and Git recheck performed before resuming; and
- any unavailable capability or residual risk.

Do not claim that a harness compacted, retried, or recovered unless its event,
status, session entry, or equivalent evidence was observed. A ticket that
never approached a limit may report `healthy` or `not-observed`; it does not
need an artificial compaction.
