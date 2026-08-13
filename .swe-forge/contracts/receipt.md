# SWE Forge Receipt Contract

A receipt is a compact public evidence summary for a completed run. It is
usually generated after the final PR URL exists and may be included in the pull
request description. It is not a transcript, working spec, or replacement for
run state.

## Template

```text
## SWE Forge receipt
Execution: SOLO | SUBAGENTS | ISOLATED
Delivery: GUIDED | PR
Run metadata: (optional; omit when unavailable)
- SWE Forge: <release version>
- Harness: <name> <version>
- Routing: <requested topology> -> <selected topology>
- Provider: NONE | NATIVE | HERDR
- Model: <safe public model label>
- Routing reason: <short rationale>
Base: <short base SHA>
Branch: <delivery branch>
Commits: <count> (<validated slice count> validated slices)
Verification:
- <check name>: passed | failed | skipped | unavailable
Fresh review: PASS | CHANGES_REQUIRED | NOT RUN — <findings> findings, <repaired> repaired
Pull request: <URL or not-created>
Final status: ACCEPTED | BLOCKED | FAILED
Merge performed: no
```

## Required evidence

Run metadata is optional and must be supplied from structured run state or
explicit harness facts. Omit unavailable fields rather than guessing. Model
labels and routing reasons must not contain credentials, private paths, raw
transcripts, or private ticket details.

A receipt may report `ACCEPTED` only when:

- the current branch is non-protected and clean
- the current HEAD is based on the recorded baseline
- at least one bounded checkpoint is recorded
- every required and applicable conditional final check passed at the current
  HEAD
- fresh review is `PASS` for the current HEAD
- `PR` delivery has a created pull-request URL

A receipt must report failed, skipped, unavailable, or missing evidence
explicitly. It must not infer a passing check from code inspection, provider
lifecycle state, or a worker summary.

## Privacy and authority

Generate receipts from structured evidence and actual Git state. Do not include
worker transcripts, command output, credentials, private ticket details, or
unbounded file dumps. A receipt summarizes evidence; the canonical run-state,
review contract, repository checks, and remote provider state remain
authoritative.
