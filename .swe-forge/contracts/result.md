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
  result: passed
- command: pnpm typecheck
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

- `DONE`: the task acceptance criteria are met and assigned validation ran
- `BLOCKED`: work cannot safely continue without context, access, or a decision
- `FAILED`: an attempted task did not meet its acceptance criteria or validation
  exposed an unresolved failure

Workers must not use `DONE` when tests were not run merely because the code
looks correct. Mark unavailable or skipped checks explicitly. A blocked or
failed result must include evidence and the smallest useful recovery action.

## Result Rules

- list every touched file, including generated or deleted files
- distinguish tests that passed from checks that were not applicable
- report assumptions separately from observed evidence
- report scope expansion as a blocker unless the contract was updated
- keep the result concise enough for the orchestrator to consume reliably
