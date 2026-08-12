# Worker Result Contract

Workers return this structured result to the orchestrator. The result is an
evidence record, not a narrative transcript. A provider lifecycle status never
substitutes for this result, Git evidence, or validation.

## Template

```text
STATUS: DONE | BLOCKED | FAILED

TASK_ID: api-validation
BASE_SHA: <exact recorded task base>
HEAD_SHA: <worker head or none>
PROVIDER_ID: <provider worker identity or none>
BRANCH: <local worker branch or none>
WORKTREE: <absolute worker worktree path or none>

SUMMARY:
<what changed or what prevented completion>

DELIVERABLE_COMMITS:
- <local worker transfer commit SHA and subject>

FILES_CHANGED:
- packages/api/src/foo/validate.ts
- packages/api/tests/foo/validate.test.ts

VALIDATION:
- command: pnpm test foo
  requirement: required
  condition: always
  result: passed
  evidence: <relevant output or reference>
- command: pnpm typecheck
  requirement: required
  condition: always
  result: passed
  evidence: <relevant output or reference>

SCOPE_EXCEPTIONS:
- <declared exception with contract update reference, or none>
STAGED_CHANGES:
- <path, or none>
UNSTAGED_CHANGES:
- <path, or none>
UNTRACKED_CHANGES:
- <path, or none>

ENVIRONMENT_RESOURCES:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup_commands: []

TESTING_DECISION:
- behavior: Invalid Foo is rejected while valid requests remain compatible.
- seam: HTTP API response boundary
- approach: acceptance
- development_mode: test-after
- rationale: Focused API tests cover the observable contract.

TEST_RESULTS:
<important output, failures, skipped checks, or unavailable tooling>

EVIDENCE:
- <file, symbol, diff, command output, Git identity, or behavior evidence>

ASSUMPTIONS:
- <assumption or none>

RISKS:
- <remaining risk or none>

FOLLOWUPS:
- <follow-up or none>
```

## Isolated Result Requirements

For a writable `ISOLATED` task, the result must include these fields even when
empty:

```yaml
task_id: <task identifier>
status: DONE | BLOCKED | FAILED
base_sha: <expected worker base>
head_sha: <worker head>
deliverable_commits: []
files_changed: []
validation: []
scope_exceptions: []
staged_changes: []
unstaged_changes: []
untracked_changes: []
environment_resources:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup_commands: []
```

The result should also identify the provider, branch, and worktree so the
orchestrator can compare them with run state. `deliverable_commits` are local
worker transfer artifacts, not integration commits. The orchestrator records
the source-commit to integration-commit mapping after central validation.
For non-isolated tasks, provider and integration strategy fields are `NONE`;
`NATIVE`/`HERDR`, `COMPOSE`, and `CHERRY_PICK` are valid only for an
`ISOLATED` task.

## Status Rules

- `DONE`: the task acceptance criteria and testing decision are met, every
  required check passed, every applicable conditional check passed or was
  explicitly resolved, and a writable checkout is clean with all changes in
  declared deliverable commits
- `BLOCKED`: work cannot safely continue without context, access, a decision,
  isolation, or a scope change
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

A writable isolated result is eligible for integration only when:

- branch and worktree identities match run state
- it started from the expected `base_sha`
- its checkout is clean
- every change is represented by a declared deliverable commit
- touched files fit its allowed scope and no forbidden scope was touched
- no unexplained untracked files remain
- required worker-level validation passed
- no forbidden delivery action occurred

## Result Rules

- list every touched file, including generated or deleted files
- distinguish tests that passed from checks that were not applicable
- report the testing decision and explain when existing coverage, manual
  evidence, or a not-applicable rationale replaces a new automated test
- report assumptions separately from observed evidence
- report scope expansion as a blocker unless the contract was updated
- report environment resources and cleanup status, not just worker status
- do not claim central integration or final acceptance from worker evidence
- keep the result concise enough for the orchestrator to consume reliably
