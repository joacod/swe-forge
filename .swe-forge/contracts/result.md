# Worker Result Contract

Workers return the smallest structured evidence needed for the root's next safe
decision. The brief and run state remain authoritative for scope,
authorization, topology, and delivery. A result reports evidence; it never
grants authority.

## One result shape

Ordinary worker results are one JSON object. `READ_ONLY` uses the common fields;
`WRITABLE` adds the candidate, changed-path, Git, and assigned-validation
fields. Optional fields are omitted when empty. The same JSON is passed through
native structured-output APIs or returned as JSON text by hosts without that
capability.

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

`RESULT_PROFILE` is `READ_ONLY` or `WRITABLE`; `STATUS` is `DONE`, `BLOCKED`,
or `FAILED`. `FINDINGS` and `EVIDENCE` are always non-empty. `RISKS` and
`RECOMMENDED_ACTION` are optional non-empty arrays (or `null` when a native
schema requires an explicit nullable field). `BLOCKED` and `FAILED` results
must include a non-empty `RECOMMENDED_ACTION`.

A read-only result contains no implementation or delivery fields. A command
used to investigate is evidence, not an implementation validation record.

## Writable result

A bounded shared-checkout writer adds these fields to the same object:

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

`BASE_SHA`, `HEAD_SHA`, and `BRANCH` identify the canonical delivery candidate,
not a private host environment. `FILES_CHANGED`, `GIT_STATE`, and `VALIDATION`
are required for a writable result. `BASE_SHA` is a full SHA; `HEAD_SHA` is a
full SHA or `none`; changed paths are repository-relative. `DELIVERABLE_COMMITS`
and `SCOPE_EXCEPTIONS` are conditional and omitted when empty.

Validation records require `command`, `requirement`, `condition`, `applies`,
`result`, and `evidence`. A required check applies and passes; an applicable
conditional check passes for `DONE`; a non-applicable conditional check is
`not-applicable`. A `DONE` writable result cannot claim no changed files or a
failed applicable check.

## Executable boundary

The portable tool validates the same object used by every host and emits the
native schema when a host supports strict structured output:

```text
.swe-forge/tools/swe-forge-worker-result schema --profile READ_ONLY --task-id ID
.swe-forge/tools/swe-forge-worker-result schema --profile WRITABLE --task-id ID
.swe-forge/tools/swe-forge-worker-result schema --profile REVIEW
.swe-forge/tools/swe-forge-worker-result validate --profile READ_ONLY|WRITABLE \
  [--task-id ID] --result FILE|-
```

`schema` emits a direct JSON Schema, not a transport description. `validate`
rejects malformed, duplicate-key, profile-mismatched, task-mismatched,
incomplete, or ambiguous ordinary results. It does not validate the dedicated
review contract.

`REVIEW` remains a separate profile using [review.md](review.md), never an
ordinary implementation result. Native review schemas may be supplied
straight to a structured-output host; the root still applies the review
contract and fresh-context rules.

## Consumption

Correlate `TASK_ID` and `STATUS` first. For `READ_ONLY`, check findings,
references, risks, and next action. For `WRITABLE`, additionally check the
canonical candidate identity, changed paths, Git state, assigned validation,
and blockers. A `DONE` result is eligible for a dependent worker only after the
root validates it against the task and derives a compact, B-specific
`dependency_digest` in B's brief. The digest is not a result field or peer
message.

Reject incomplete, ambiguous, profile-mismatched, or scope-expanding results
as `BLOCKED`; do not fill missing evidence from the brief or memory. Workers do
not create PRs, push, merge, publish, deploy, reroute, or recursively delegate
by default.
