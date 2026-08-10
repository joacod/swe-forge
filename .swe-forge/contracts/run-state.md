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
execution_mode: SOLO | SUBAGENTS | HERDR
reason: <why this topology was selected>

started_at: <ISO-8601 timestamp>
updated_at: <ISO-8601 timestamp>
current_wave: research

tasks:
  research:
    status: pending | ready | running | blocked | done | failed | skipped
    dependencies: []
    attempts: 1
  implementation:
    status: ready
    dependencies:
      - research
    attempts: 0

review:
  status: pending | running | pass | changes-required | skipped
  blocked_by: []

retries:
  research: 0
  implementation: 0
```

## Rules

- keep state temporary by default, outside the repository
- use an ignored `.swe-forge/runs/` directory only when local state is needed
- update task status only from evidence or an explicit orchestrator decision
- preserve dependency and retry information during recovery
- never store credentials, secrets, full transcripts, or private ticket data
- treat the final repository diff, tests, and review as authoritative over stale
  run state

The implementation may use a more specific timestamp or task schema, but it
must preserve the workflow version, execution mode, task status, dependencies,
review status, and retry visibility.
