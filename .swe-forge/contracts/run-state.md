# Run-State Contract

Run state is a lightweight snapshot of the active workflow. It supports
recovery and coordination without becoming a second source of truth or a
repository transcript.

## Template

```yaml
workflow: swe-forge
version: 1
run_id: <unique-run-id>

status: planning | running | blocked | reviewing | repairing | accepted | failed
prior_status: <state before blocked or none>
requested_mode: AUTO | SOLO | SUBAGENTS | HERDR
execution_mode: SOLO | SUBAGENTS | HERDR
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this topology was selected>
fallback_used: no | <requested mode -> selected mode and reason>

started_at: <ISO-8601 timestamp>
updated_at: <ISO-8601 timestamp>
current_wave: research
ticket_ref: <immutable ticket or external artifact reference>
working_spec_ref: <external temporary working spec, active context, or none>
acceptance_ref: <acceptance criteria reference>
checkout:
  path: <absolute checkout path>
  head: <revision>
  branch: <branch>
  classification: writable | protected | detached | unclassifiable
  baseline_ref: <working-tree inventory reference>
authorization_ref: <per-action authorization record or none>

tasks:
  research:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
  implementation:
    status: ready
    dependencies:
      - research

review:
  status: pending | running | pass | changes-required | skipped
  blocked_by: []
  attempts: 0
  retry_ceiling: 2
  ceiling_provenance: default

checkpoint:
  status: not-applicable | awaiting-user | resumed | complete
  number: 0
  next_slice: <bounded review slice or none>
  requested_action: <continue, revise, commit, or none>

delivery:
  commit: not-authorized | pending | complete | blocked
  push: not-authorized | pending | complete | blocked
  create_pull_request: not-authorized | pending | complete | blocked
  sync: not-authorized | pending | complete | blocked
  pull_request_ref: <URL or none>

validation_ref: <structured validation evidence or none>
cleanup:
  status: pending | complete | incomplete | not-needed
  remaining_resources: []

retries:
  research: {attempts: 0, ceiling: 1, ceiling_provenance: default}
  implementation: {attempts: 0, ceiling: 1, ceiling_provenance: default}
```

## Rules

- keep state temporary by default, outside the repository
- use an ignored `.swe-forge/runs/` directory only when local state is needed
- verify a repository-local path is ignored before writing it; do not add ignore
  rules without explicit scope
- update task status only from evidence or an explicit orchestrator decision
- preserve dependency and retry information during recovery
- treat `retries.<task>.attempts` as the single authoritative attempt counter
- preserve checkout identity, baseline, authorization, validation, review
  attempts, delivery mode, checkpoint state, working-spec reference, prior
  status, retry ceilings and provenance, and cleanup state during recovery
- never store credentials, secrets, full transcripts, or private ticket data
- treat the final repository diff, tests, and review as authoritative over stale
  run state
- clean external state at completion and record cleanup failures

The implementation may use a more specific timestamp or task schema, but it
must preserve the run-state format version, requested and selected execution and
delivery modes, task status, dependencies, review status, retry visibility,
checkout identity, authorization, validation evidence, checkpoint state, and
cleanup status.
It must also preserve the prior status needed to resume a blocked run and every
task or review retry ceiling, including provenance for an increased ceiling.
It must preserve whether a checkpoint is awaiting user input and whether each
delivery action was authorized, completed, or blocked.

## Transitions

- `planning` may become `running`, `blocked`, or `failed`
- `running` may become `blocked`, `reviewing`, `failed`, or return to `planning`
  after an explicit topology or contract revision
- `reviewing` may become `repairing`, `accepted`, `blocked`, or `failed`
- `repairing` may become `reviewing`, `blocked`, or `failed`
- `blocked` may resume at its recorded prior state or become `failed`
- `accepted` and `failed` are terminal
- only a dependency in `done` satisfies a downstream task; `blocked`, `failed`,
  and `skipped` require an explicit contract revision before dependents run
- retries increment attempts without releasing ownership; topology changes must
  cancel or serialize old ownership before replacement tasks become ready
