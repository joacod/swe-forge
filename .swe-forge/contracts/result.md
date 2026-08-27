# Worker Result Contract

Return only the structured evidence the root needs for its next safe decision.
The brief and run state own scope, authorization, topology, and delivery. A
result reports evidence; it grants no authority.

## Ordinary result

Return one JSON object. `READ_ONLY` uses this shape; `WRITABLE` adds the fields
below. Omit optional empty fields. Native structured output and text fallback
use the same JSON.

```json
{
  "RESULT_PROFILE": "READ_ONLY",
  "STATUS": "DONE",
  "TASK_ID": "<task identifier>",
  "FINDINGS": ["<concise independently checkable outcome or issue>"],
  "EVIDENCE": ["<precise file, symbol, command, Git, or behavior reference>"],
  "RISKS": ["<relevant risk or unknown>"],
  "RECOMMENDED_ACTION": ["<next action when useful>"]
}
```

`RESULT_PROFILE` is `READ_ONLY` or `WRITABLE`; `STATUS` is `DONE`, `BLOCKED`, or
`FAILED`. `FINDINGS` and `EVIDENCE` are non-empty. `RISKS` and
`RECOMMENDED_ACTION` are optional non-empty arrays, or `null` when a native
schema requires it. `BLOCKED` and `FAILED` require `RECOMMENDED_ACTION`.
Read-only results contain no implementation or delivery fields. Investigation
commands are evidence, not implementation validation records.

## Writable result

A shared-checkout writer adds:

```json
{
  "RESULT_PROFILE": "WRITABLE",
  "STATUS": "DONE",
  "TASK_ID": "<task identifier>",
  "BASE_SHA": "<canonical delivery base>",
  "HEAD_SHA": "<canonical delivery head or none>",
  "BRANCH": "<canonical delivery branch or none>",
  "FILES_CHANGED": ["<repository-relative path>"],
  "GIT_STATE": ["clean"],
  "VALIDATION": [
    {
      "command": "<assigned check>",
      "requirement": "required | conditional | informational",
      "condition": "<when it applies>",
      "applies": true,
      "result": "passed | failed | unavailable | not-applicable",
      "evidence": "<concise reference>"
    }
  ],
  "FINDINGS": ["<concise outcome or issue>"],
  "EVIDENCE": ["<diff, file, symbol, command, Git, or behavior reference>"],
  "DELIVERABLE_COMMITS": ["<local SHA and subject>"],
  "SCOPE_EXCEPTIONS": ["<contract revision reference>"],
  "RISKS": ["<relevant risk or unknown>"],
  "RECOMMENDED_ACTION": ["<next action when useful>"]
}
```

`BASE_SHA`, `HEAD_SHA`, and `BRANCH` identify the canonical candidate, not a
private environment. `BASE_SHA` and `HEAD_SHA` are full SHAs, except
`HEAD_SHA: none`; paths are repository-relative. `FILES_CHANGED`, `GIT_STATE`,
and `VALIDATION` are required. Omit `DELIVERABLE_COMMITS` and
`SCOPE_EXCEPTIONS` when empty.

Each validation item requires `command`, `requirement`, `condition`, `applies`,
`result`, and `evidence`. A `DONE` writable result needs changed files and no
failed applicable check. Required and applicable conditional checks pass;
non-applicable conditionals are `not-applicable`.

## Executable boundary

The portable tool validates the same object for every host:

```text
.swe-forge/tools/swe-forge-worker-result schema --profile READ_ONLY --task-id ID
.swe-forge/tools/swe-forge-worker-result schema --profile WRITABLE --task-id ID
.swe-forge/tools/swe-forge-worker-result schema --profile REVIEW
.swe-forge/tools/swe-forge-worker-result validate --profile READ_ONLY|WRITABLE \
  [--task-id ID] --result FILE|-
```

`schema` emits direct JSON Schema. `validate` rejects malformed, duplicate-key,
profile-mismatched, task-mismatched, incomplete, or ambiguous ordinary results.
It does not validate the dedicated review contract. `REVIEW` uses
`contracts/review.md`, never an ordinary implementation result; native review
schemas may go directly to a structured-output host, but the root still applies
fresh-context and contract rules.

## Consumption

Correlate `TASK_ID` and `STATUS` first. For `READ_ONLY`, check findings,
evidence, risks, and next action. For `WRITABLE`, also check candidate identity,
changed paths, Git state, assigned validation, and blockers. A `DONE` result can
feed dependent work only after root validation and a compact, B-specific
`dependency_digest` in B's brief. Reject incomplete, ambiguous,
profile-mismatched, or scope-expanding results as `BLOCKED`; never fill fields
from memory. Workers do not deliver or recursively delegate by default.
