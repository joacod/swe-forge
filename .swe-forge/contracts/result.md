# Worker Result Contract

Workers return the smallest structured result that lets the orchestrator make
its next safe decision. The task briefing and run state remain the source of
scope, acceptance, topology, authorization, and delivery truth; a result
reports only the evidence produced by the worker.

## Executable contract surface

The dependency-free `.swe-forge/tools/swe-forge-worker-result` tool exposes
this contract without coupling it to a host runtime. `schema` emits the
machine-readable `worker-result/v1` profile map. `validate` accepts an ordinary
`READ_ONLY` or `WRITABLE` result, checks its profile-specific fields and
validation records, and exits non-zero for malformed or incompatible input.
Successful validation returns a compact machine-readable confirmation; the
returned result remains untrusted evidence until the normal workflow consumes
it.

The same tool supplies host-neutral structured transport ports without moving
host API mechanics into the canonical layer:

```text
swe-forge-worker-result schema --profile READ_ONLY --task-id ID --format json-schema
swe-forge-worker-result schema --profile WRITABLE --task-id ID --format json-schema
swe-forge-worker-result schema --profile REVIEW --format json-schema
swe-forge-worker-result encode --profile READ_ONLY|WRITABLE --task-id ID --input FILE|-
```

The JSON-Schema projections bind ordinary results to their canonical task ID.
`encode` validates the structured ordinary result, rejects unsafe values, and
emits the existing line-oriented representation. Review semantics and the
blocking matrix remain owned by `review.md` and the accountable root workflow.

`REVIEW` uses `review.md` and its blocking matrix. Reviewers therefore return
the dedicated review shape rather than an implementation result profile.

## Profile selection

The profile is selected from the worker's role and write access. This table is
the canonical profile map; roles and policies refer to it rather than defining
competing result shapes.

| Worker responsibility | Profile | Canonical return contract |
| --- | --- | --- |
| Read-only research or analysis that returns a worker result | `READ_ONLY` | This file, [Read-only result](#read-only-result) |
| Bounded writable implementation in the delivery checkout | `WRITABLE` | This file, [Writable result](#normal-writable-result) |
| Independent review | `REVIEW` | [review.md](review.md), never an implementation result |

## Ordinary result rules

`READ_ONLY` and `WRITABLE` are ordinary line-oriented result profiles. They
share only the fields needed to correlate and consume evidence. The executable
validator accepts the field shape below and rejects unknown or profile-
irrelevant fields:

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
  merely to match the writable profile.
- `DONE` means the bounded task was answered with the evidence required by its
  task contract. It does not authorize delivery or replace Git/evidence gates.
- `BLOCKED` and `FAILED` include the evidence and smallest useful next action;
  they do not need irrelevant checkout or delivery headings.

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
- The researcher can report the profile boundary without a checkout snapshot.

EVIDENCE:
- .swe-forge/contracts/result.md#profile-selection
- .swe-forge/agents/researcher.md#output

RISKS:
- <only a relevant unknown>

RECOMMENDED_ACTION:
- Use the READ_ONLY profile for the discovery task.
```

Do not add `BASE_SHA`, `HEAD_SHA`, `BRANCH`, `CHECKOUT`, `FILES_CHANGED`,
`GIT_STATE`, `DELIVERABLE_COMMITS`, `VALIDATION`, environment resources, or
delivery authorization to a read-only result. A command used during research
is evidence, not an implementation validation block.

### Normal writable result

A bounded implementer adds only the Git, change, and validation evidence needed
to verify and consume its implementation:

```text
RESULT_PROFILE: WRITABLE
STATUS: DONE
TASK_ID: result-contract-profiles

BASE_SHA: <exact delivery-checkout base>
HEAD_SHA: <delivery-checkout head or none>
BRANCH: <delivery branch or none>
CHECKOUT: <absolute delivery-checkout path>

FILES_CHANGED:
- <repository-relative path>

GIT_STATE:
- clean
# For a dirty checkout, list only the relevant non-empty categories instead:
# - staged: <path>
# - unstaged: <path>
# - untracked: <path>

DELIVERABLE_COMMITS:
- <local commit SHA and subject; emit only when a commit exists>

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
than repeating testing prose.

The task contract remains responsible for allowed scope and per-action
authorization. The result exposes changed paths and exceptions so the
orchestrator can compare them with that contract; it does not grant authority.

## Review result

Review workers use [review.md](review.md) and its `PASS`/
`CHANGES_REQUIRED` contract. They are not asked to reshape review findings into
`READ_ONLY` or `WRITABLE`, and a review result never replaces implementation
evidence.

## Consumption

Consume every result through the selected profile:

- correlate `TASK_ID` and `STATUS` first;
- for `READ_ONLY`, evaluate findings, references, risks, and any recommended
  action without inventing Git or delivery requirements;
- for `WRITABLE`, verify scope, checkout identity, Git/change evidence,
  assigned validation, and blockers before consuming the implementation; and
- for `REVIEW`, evaluate the dedicated review contract and its blocking matrix.

Workers do not create PRs, push, merge, publish, deploy, make delivery
choices, reroute the root ticket, or recursively delegate by default.
