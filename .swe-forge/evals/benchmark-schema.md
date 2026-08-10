# Benchmark Schema

This schema records one condition on one historical ticket. It is intentionally
provider-neutral and accepts unknown values when a harness cannot expose a
metric.

```yaml
schema_version: 1

ticket:
  ticket_id: example-001
  category: trivial | normal | complex | cross-module | bugfix | refactor | architectural | security-sensitive
  repository_revision: <immutable revision>
  acceptance_tests: known | partial | none

condition:
  name: baseline | swe-forge
  invocation: normal | explicit-swe-forge
  requested_mode: AUTO | SOLO | SUBAGENTS | HERDR | unknown
  execution_mode: SOLO | SUBAGENTS | HERDR | unknown
  capability_classes:
    orchestrator: <class or unknown>
    implementer: <class or unknown>
    reviewer: <class or not-used>

execution:
  started_at: <ISO-8601 timestamp>
  duration_seconds: <number or null>
  agent_calls: <integer or null>
  worker_count: <integer or null>
  retries: <integer or null>
  blocked_tasks: <integer or null>
  worktrees_created: <integer or null>
  external_orchestration_seconds: <number or null>

outcome:
  completed: true | false | unknown
  acceptance_tests_passed: true | false | not-run | unknown
  quality_gates_passed: true | false | partial | not-run | unknown
  regressions: <integer or unknown>
  human_corrections: <integer or unknown>
  reviewer_findings:
    critical: <integer or unknown>
    high: <integer or unknown>
    medium: <integer or unknown>
    low: <integer or unknown>
  defects_caught_before_completion: <integer or unknown>

cost:
  input_tokens: <integer or unknown>
  output_tokens: <integer or unknown>
  total_tokens: <integer or unknown>
  estimated_cost: <number or unknown>

diff:
  files_changed: <integer or unknown>
  lines_added: <integer or unknown>
  lines_removed: <integer or unknown>
  unrelated_changes: true | false | unknown

notes:
  assumptions: []
  failures: []
  limitations: []
```

## Field Rules

- keep `ticket_id` stable across baseline and Forge conditions
- use the same `repository_revision` for matched comparisons
- distinguish `not-run` from `unknown`
- record retry and worktree overhead even when the outcome succeeds
- count reviewer findings independently from defects fixed before review
- do not record credentials, private prompts, or full transcripts
