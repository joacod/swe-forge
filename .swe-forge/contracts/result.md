# Worker Result Contract

Ordinary workers may return the human-readable contract below. Writable
isolated workers must additionally produce the one machine-valid bundle
defined in `result-bundle.md` and validated by
`scripts/swe-forge-isolated-gate`. Provider completion status never replaces
Git evidence or validation.

## Ordinary result

```text
STATUS: DONE | BLOCKED | FAILED
TASK_ID: <task identifier>
BASE_SHA: <exact task base>
HEAD_SHA: <worker head or none>
PROVIDER_ID: <provider identity or none>
BRANCH: <local branch or none>
WORKTREE: <absolute worktree or none>

SUMMARY:
<bounded outcome or blocker>

DELIVERABLE_COMMITS:
- <local transfer commit SHA and subject>

FILES_CHANGED:
- <repository-relative path>

VALIDATION:
- command: <command>
  requirement: required | conditional | informational
  condition: <when it applies>
  applies: true | false
  result: passed | failed | unavailable | not-applicable
  evidence: <reference>

SCOPE_EXCEPTIONS:
- <none or contract revision reference>
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
- behavior: <observable behavior>
- seam: <public seam or none>
- approach: regression | acceptance | characterization | existing-sufficient | manual | not-applicable
- development_mode: test-first | test-after | not-applicable
- rationale: <smallest useful evidence>

TEST_RESULTS:
<important output, unavailable checks, or failures>
EVIDENCE:
- <file, symbol, diff, command, Git, or behavior evidence>
ASSUMPTIONS:
- <assumption or none>
RISKS:
- <risk or none>
FOLLOWUPS:
- <follow-up or none>
```

The ordinary result uses `deliverable_commits:`, `scope_exceptions:`,
`staged_changes:`, `unstaged_changes:`, `untracked_changes:`, and
`environment_resources:` as the corresponding structured fields when serialized.

## Fixed isolated result bundle

A writable isolated worker must return exactly one dependency-free evidence
bundle with this directory shape:

```text
result/
  meta.tsv
  commits.txt
  files.txt
  validations.tsv
  scope-exceptions.txt
  staged.txt
  unstaged.txt
  untracked.txt
  resources.tsv
```

`meta.tsv` is a fixed set of unique tab-separated `key<TAB>value` records:

```text
schema_version<TAB>1
task_id<TAB><task id>
status<TAB>DONE | BLOCKED | FAILED
provider<TAB>NATIVE | HERDR
branch<TAB><local worker branch>
worktree<TAB><absolute worker worktree>
base_sha<TAB><full 40-character SHA>
head_sha<TAB><full 40-character SHA>
candidate_fingerprint<TAB><full 40-character fingerprint>
```

The validator rejects missing, repeated, unknown, or malformed required fields,
control characters, short SHAs, and non-`NATIVE`/`HERDR` providers. It does
not use `eval`. Every other bundle file is required, even when empty.

`commits.txt` contains one full commit SHA per line. `files.txt` contains one
repository-relative path per line and must equal actual changed paths for the
full declared range. `validations.tsv` contains one record per planned worker
check:

```text
check-name<TAB>passed | failed | unavailable | not-applicable<TAB>candidate-fingerprint<TAB>reason
```

Required checks must pass. A conditional check must pass when applicable or be
explicitly not applicable with a non-empty reason. Unavailable required or
applicable conditional checks block eligibility. Informational checks remain
visible but do not block. Empty `scope-exceptions.txt`, `staged.txt`,
`unstaged.txt`, and `untracked.txt` are explicit cleanliness evidence. A
resource record is line-oriented and cannot contain unsupported control
characters.

The guard compares actual branch/worktree identity, exact base and head,
declared commit range, changed paths, scopes, worker cleanliness,
worker candidate fingerprint, validation plan, and absence of unauthorized
worker remote refs where observable. A worker is not integration-eligible merely
because an agent or provider reports completion.

## Status rules

`DONE` requires task acceptance, every required and applicable conditional
check, a clean worker checkout, declared commits, and a valid bundle. An
unavailable required check is `BLOCKED` when an environment or decision can
resolve it, and `FAILED` when an attempted task cannot meet its contract.

The orchestrator alone records central integration commits and
source-to-integration mappings. Workers never push, create PRs, publish,
deploy, merge, or silently expand scope.
