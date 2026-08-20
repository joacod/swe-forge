# Worker Result Contract

Workers return the smallest structured result that lets the orchestrator make
its next safe decision. The task briefing and run state remain the source of
scope, acceptance, topology, authorization, and delivery truth; a result
reports only the evidence produced by the worker.

## Profile selection

The profile is selected from the worker's role, write access, and execution
mode. This table is the canonical profile map; roles, policies, and providers
refer to it rather than defining competing result shapes.

| Worker responsibility | Profile | Canonical return contract |
| --- | --- | --- |
| Read-only research or analysis that returns a worker result | `READ_ONLY` | This file, [Read-only result](#read-only-result) |
| Normal writable implementation in a shared checkout | `WRITABLE` | This file, [Writable result](#normal-writable-result) |
| Writable implementation in `ISOLATED` execution | `ISOLATED_WRITABLE` | [result-bundle.md](result-bundle.md) and the isolated gate |
| Independent review | `REVIEW` | [review.md](review.md), never an implementation result |

`ISOLATED_WRITABLE` is a semantic profile name only. It is not an additional
field in `result/meta.tsv`; the fixed bundle and its validator remain the
machine-valid source of truth for isolated work.

## Ordinary result rules

`READ_ONLY` and `WRITABLE` are ordinary human-readable result profiles. They
share only the fields needed to correlate and consume evidence:

```text
RESULT_PROFILE: READ_ONLY | WRITABLE
STATUS: DONE | BLOCKED | FAILED
TASK_ID: <task identifier>

FINDINGS:
- <concise independently checkable finding>

EVIDENCE:
- <precise file, symbol, command, Git, or behavior reference>

RISKS:
- <relevant risk or unknown; omit this section when there is none>

RECOMMENDED_ACTION:
- <next action for the accountable orchestrator; omit when no action is useful>
```

Rules for both ordinary profiles:

- `RESULT_PROFILE`, `STATUS`, `TASK_ID`, `FINDINGS`, and `EVIDENCE` are the
  common result surface. Keep findings concise and use references instead of
  pasting source excerpts or replaying exploration.
- `RISKS` and `RECOMMENDED_ACTION` are conditional. Do not emit empty sections
  merely to match the writable or isolated profile.
- `DONE` means the bounded task was answered with the evidence required by its
  task contract. It does not authorize delivery or replace Git/evidence gates.
- `BLOCKED` and `FAILED` include the evidence and smallest useful next action;
  they do not need irrelevant checkout or environment headings.

### Dependency handoff eligibility

A `DONE` result is eligible to inform a dependent worker only after the root
orchestrator verifies its task identity, profile, scope, required evidence, and
assigned validation. The root may then derive a compact `dependency_digest`
from the accepted result and the dependent task's objective and acceptance
criteria. The digest belongs in the dependent worker's existing briefing
projection; it is not a new result field, peer message, or persistent
coordination record.

The full result remains root-owned. A digest may carry only B-relevant accepted
decisions, facts, interfaces, paths or symbols, authoritative assumptions,
validation facts, unresolved risks, and references for deeper inspection. It
must not copy reasoning, exploration, unrelated findings, full logs, full
diffs, or unrelated delivery metadata. A dependent worker remains bounded by
its own task contract and must request a contract revision before expanding
scope.

### Read-only result

A researcher or other read-only analysis worker normally returns only the
common surface:

```text
RESULT_PROFILE: READ_ONLY
STATUS: DONE
TASK_ID: repository-result-contract-map

FINDINGS:
- Ordinary result.md currently requires implementation-shaped fields for read-only research.

EVIDENCE:
- .swe-forge/contracts/result.md#profile-selection
- .swe-forge/agents/researcher.md#output

RISKS:
- <only a relevant unknown>

RECOMMENDED_ACTION:
- Use the READ_ONLY profile for the discovery task.
```

Do not add `BASE_SHA`, `HEAD_SHA`, `BRANCH`, `WORKTREE`, `FILES_CHANGED`,
`GIT_STATE`, `DELIVERABLE_COMMITS`, `VALIDATION`, environment resources, or
delivery authorization to a read-only result. A command used during research
is evidence, not an implementation validation block.

### Normal writable result

A normal shared-checkout implementer adds only the Git, change, and validation
evidence needed to verify and consume its implementation:

```text
RESULT_PROFILE: WRITABLE
STATUS: DONE
TASK_ID: result-contract-profiles

BASE_SHA: <exact task base>
HEAD_SHA: <worker head or none>
BRANCH: <local branch or none>
WORKTREE: <absolute worktree or none>

FILES_CHANGED:
- <repository-relative path>

GIT_STATE:
- clean
# For a dirty checkout, list only the relevant non-empty categories instead:
# - staged: <path>
# - unstaged: <path>
# - untracked: <path>

DELIVERABLE_COMMITS:
- <local commit SHA and subject; emit only when a transfer or commit exists>

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
- <concise implementation outcome or issue>

EVIDENCE:
- <diff, file, symbol, command, Git, or behavior reference>

RISKS:
- <relevant risk or unknown; omit when there is none>

RECOMMENDED_ACTION:
- <next action; omit when no action is useful>
```

`BASE_SHA`, `HEAD_SHA`, checkout identity, `FILES_CHANGED`, `GIT_STATE`, and
assigned `VALIDATION` entries are required when the writable task reaches that
stage. `DELIVERABLE_COMMITS` and `SCOPE_EXCEPTIONS` are conditional; do not
return empty lists. The task contract and working spec already contain the
testing decision, so a writable result reports the checks actually run rather
than repeating `TESTING_DECISION` or exploratory `TEST_RESULTS` prose.

The task contract remains responsible for allowed scope and per-action
authorization. The result exposes changed paths and exceptions so the
orchestrator can compare them with that contract; it does not grant authority.

## Isolated writable result

An isolated writer must return the complete fixed directory bundle defined in
[result-bundle.md](result-bundle.md). Every bundle file remains required even
when its contents are empty, and `scripts/swe-forge-isolated-gate` remains the
eligibility gate. A concise ordinary `WRITABLE` result cannot substitute for
`meta.tsv`, declared commits and files, validation fingerprints, cleanliness,
scope exceptions, or resource evidence.

The isolated workflow owns provider lifecycle and central integration. The
orchestrator accepts an isolated worker only after the fixed bundle, actual Git
state, planned validation, exact base, scope, and integration evidence pass the
gate.

## Review result

Review workers use [review.md](review.md) and its `PASS`/
`CHANGES_REQUIRED` contract. They are not asked to reshape review findings into
`READ_ONLY` or `WRITABLE`, and a review result never replaces implementation
or isolated evidence.

## Compatibility and consumption

Older ordinary results may contain legacy fields such as
`deliverable_commits:`, `scope_exceptions:`, `staged_changes:`,
`unstaged_changes:`, `untracked_changes:`, `environment_resources:`,
`testing_decision:`, or `test_results:`. The orchestrator may consume those
fields when a task contract makes them relevant, but new workers should use the
profile above and must not emit empty legacy sections. Provider metadata and
isolated transfer fields belong to run state or the fixed bundle, not to a
read-only result.

Consume every result through the selected profile:

- correlate `TASK_ID` and `STATUS` first;
- for `READ_ONLY`, evaluate findings, references, risks, and any recommended
  action without inventing Git or delivery requirements;
- for `WRITABLE`, verify scope, Git/change evidence, assigned validation, and
  blockers before consuming the implementation;
- for `ISOLATED_WRITABLE`, run the fixed isolated gate and central integration
  workflow; and
- for `REVIEW`, evaluate the dedicated review contract and its blocking matrix.

Workers do not create PRs, push, merge, publish, deploy, make delivery
choices, reroute the root ticket, or recursively delegate by default.
