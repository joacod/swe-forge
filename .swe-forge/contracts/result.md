# Worker Result Contract

Workers return this structured result to the orchestrator. The result is an
evidence record, not a narrative transcript.

## Template

```text
STATUS: DONE | BLOCKED | FAILED

TASK_ID: api-validation

SUMMARY:
<what changed or what prevented completion>

FILES_TOUCHED:
- packages/api/src/foo/validate.ts
- packages/api/tests/foo/validate.test.ts

TESTS_RUN:
- command: pnpm test foo
  requirement: required
  condition: always
  result: passed
- command: pnpm typecheck
  requirement: required
  condition: always
  result: passed

TEST_RESULTS:
<important output, failures, skipped checks, or unavailable tooling>

EVIDENCE:
- <file, symbol, diff, command output, or behavior evidence>

ASSUMPTIONS:
- <assumption or none>

RISKS:
- <remaining risk or none>

FOLLOWUPS:
- <follow-up or none>
```

## Status Rules

- `DONE`: the task acceptance criteria are met, every required check passed,
  and every applicable conditional check passed or was explicitly resolved
- `BLOCKED`: work cannot safely continue without context, access, or a decision
- `FAILED`: an attempted task did not meet its acceptance criteria or validation
  exposed an unresolved failure

Required checks may not be skipped, substituted, or marked unavailable under
`DONE`. An unavailable required check produces `BLOCKED` when a decision or
environment can resolve it and `FAILED` when the task was attempted but cannot
meet its acceptance contract. A substitution requires an updated task contract.
Informational checks may fail without changing task status, but their evidence
and risk remain visible. Workers must not use `DONE` merely because the code
looks correct. A blocked or failed result must include evidence and the smallest
useful recovery action.

For a conditional check, the result must repeat the contract condition, record
`applies: true | false`, and include the evidence supporting that determination.

## Result Rules

- list every touched file, including generated or deleted files
- distinguish tests that passed from checks that were not applicable
- report assumptions separately from observed evidence
- report scope expansion as a blocker unless the contract was updated
- keep the result concise enough for the orchestrator to consume reliably
