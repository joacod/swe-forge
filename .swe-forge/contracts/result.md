# Worker Result Contract

Return the smallest structured evidence needed for the root's next safe
decision. The task briefing and run state remain authoritative for scope,
authorization, topology, and delivery. Review results use `review.md`, not an
ordinary result profile.

## Executable surface

`.swe-forge/tools/swe-forge-worker-result` owns the ordinary `worker-result/v1`
profiles, validation, JSON-Schema projection, and line-oriented encoding:

```text
swe-forge-worker-result schema --profile READ_ONLY --task-id ID --format json-schema
swe-forge-worker-result schema --profile WRITABLE --task-id ID --format json-schema
swe-forge-worker-result schema --profile REVIEW --format json-schema
swe-forge-worker-result encode --profile READ_ONLY|WRITABLE --task-id ID --input FILE|-
```

The profile map is:

| Responsibility | Profile | Contract |
| --- | --- | --- |
| read-only research or analysis | `READ_ONLY` | this file |
| bounded writable implementation | `WRITABLE` | this file |
| independent review | `REVIEW` | [review.md](review.md) |

The validator checks profile fields and task identity. A valid result is still
untrusted evidence until the root checks scope, candidate state, and acceptance.

## Common result

Both ordinary profiles use this line-oriented shape:

```text
RESULT_PROFILE: READ_ONLY | WRITABLE
STATUS: DONE | BLOCKED | FAILED
TASK_ID: <task identifier>

FINDINGS:
- <concise independently checkable outcome or issue>

EVIDENCE:
- <precise file, symbol, command, Git, or behavior reference>

RISKS:
- <relevant risk or unknown; omit when empty>

RECOMMENDED_ACTION:
- <next action; omit when unnecessary>
```

`DONE` means the bounded task satisfied its contract evidence; it does not
authorize delivery. `BLOCKED` and `FAILED` include evidence and the smallest
useful next action. Do not add empty sections or fields for another profile.

## Read-only result

A read-only result contains only the common surface. Do not add Git, changed
paths, worker execution metadata, validation blocks, environment resources, or
delivery authorization. A command used for research is evidence, not an
implementation validation record.

## Writable result

A bounded implementation adds the evidence needed to consume its materialized
canonical candidate:

```text
RESULT_PROFILE: WRITABLE
STATUS: DONE
TASK_ID: <task identifier>

BASE_SHA: <canonical delivery base>
HEAD_SHA: <canonical delivery head or none>
BRANCH: <canonical delivery branch or none>

FILES_CHANGED:
- <repository-relative path>

GIT_STATE:
- clean
# otherwise list only relevant staged, unstaged, or untracked paths

DELIVERABLE_COMMITS:
- <local SHA and subject; omit when none>

VALIDATION:
- command: <assigned check>
  requirement: required | conditional | informational
  condition: <when it applies>
  applies: true | false
  result: passed | failed | unavailable | not-applicable
  evidence: <concise reference>

SCOPE_EXCEPTIONS:
- <contract revision reference; omit when none>

FINDINGS:
- <concise outcome or issue>

EVIDENCE:
- <diff, file, symbol, command, Git, or behavior reference>
```

`BASE_SHA`, `HEAD_SHA`, and `BRANCH` identify the canonical delivery candidate,
not the worker's physical environment. `FILES_CHANGED`, `GIT_STATE`, and
assigned `VALIDATION` are required when the task reaches that stage.
`DELIVERABLE_COMMITS` and `SCOPE_EXCEPTIONS` are conditional. The task contract
owns scope and authorization; the result only reports paths and exceptions.

## Consumption

Correlate task identity and status first. For `READ_ONLY`, check concise
findings, references, risks, and next action. For `WRITABLE`, additionally
check canonical candidate identity, changed paths, Git state, assigned checks,
and blockers. A `DONE` result is eligible for a dependent worker only after the
root validates it against its task and derives a compact B-relevant
`dependency_digest` in the dependent briefing. The digest is not a peer message
or result field.

Reject incomplete, ambiguous, profile-mismatched, or scope-expanding results as
`BLOCKED`; do not fill missing evidence from the briefing or memory. Workers do
not create PRs, push, merge, publish, deploy, reroute, or recursively delegate
by default.
