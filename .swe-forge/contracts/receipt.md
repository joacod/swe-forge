# SWE Forge Receipt Contract

A receipt is a compact public evidence summary generated from the executable
evidence ledger. It contains no transcripts, raw logs, secrets, or private
ticket content. It is not a replacement for run state, review, or final Git
inspection.

## Template

```text
## SWE Forge receipt
Execution: SOLO | SUBAGENTS | ISOLATED
Delivery: GUIDED | PR
Run metadata: (optional)
- SWE Forge: <release version>
- Harness: <name> <version>
- Routing: <requested topology> -> <selected topology>
- Execution provider: NONE | NATIVE | HERDR
- Model provider: <safe public model provider label>
- Routing reason: <short rationale>
Repository: <repository identity>
Base: <short base SHA>
Branch: <delivery branch>
Head: <short final SHA>
Evidence fingerprint: <short final fingerprint>
Context: healthy | compacted | overflow-recovered | not-observed | blocked — <short evidence>
Generated at: <UTC timestamp>
Commits: <count> (<validated slice count> validated slices)
Verification:
- <planned check>: passed | failed | skipped | unavailable | not-applicable
Fresh review: PASS | CHANGES_REQUIRED | NOT RUN — <findings> findings, <repaired> repaired
Pull request: <URL or not-created>
Final status: ACCEPTED | BLOCKED | FAILED
```

Receipts render the latest relevant status for every planned check, not an
undifferentiated history of attempts. Historical attempts stay in the private
ledger.

`Execution provider` describes the isolated worker lifecycle and is `NONE` for
non-isolated runs; it is not the model backend. Record a `Model provider`
separately only when a safe public label is available. Omit unavailable
metadata rather than guessing, and never publish credentials, private paths,
raw transcripts, or private ticket details.

## Required evidence

`ACCEPTED` requires a clean non-protected branch, a baseline ancestor, at least
one checkpoint, every required and applicable conditional final check passing
for the exact current candidate fingerprint, fresh review `PASS` for the exact
current `HEAD` and fingerprint, and a PR URL in `PR` mode.

The read-only `receipt-verify` operation compares the receipt with the current
repository identity, branch, `HEAD`, final candidate fingerprint, and final
evidence state. A receipt created before a later commit, same-path edit,
untracked-content change, or replacement file is stale and must be rejected.

A receipt reports failed, skipped, unavailable, not-applicable, or missing
evidence explicitly. Context status is `not-observed` when no limit was reached;
when pressure occurred, the receipt names the observed compaction/recovery
evidence or reports `blocked`. It never infers success from provider lifecycle
state or worker summaries and cannot be hand-edited to upgrade a status.
