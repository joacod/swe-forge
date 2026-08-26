# SWE Forge Receipt Contract

A receipt is a compact private run-evidence summary generated from the
executable evidence ledger. It contains no transcripts, raw logs, secrets, or
private ticket content. It is not a replacement for run state, review, or final
Git inspection, and it is not a project-facing PR description, commit message,
branch name, or changelog entry. Never copy a receipt into a PR description;
this rule applies to every repository, including SWE Forge itself.

## Template

```text
## SWE Forge receipt
Execution: SOLO | SUBAGENTS
Delivery: GUIDED | PR
Run metadata: (optional)
- SWE Forge: <release version>
- Harness: <name> <version>
- Routing: <requested topology> -> <selected topology>
- Model provider: <safe public model provider label>
- Routing reason: <short rationale>
Repository: <repository identity>
Base: <short base SHA>
Branch: <delivery branch>
Head: <short final SHA>
Evidence fingerprint: <short final fingerprint>
Generated at: <UTC timestamp>
Commits: <count> (<validated slices>, <review-repair commits>)
Verification:
- <registered check>: passed | failed | skipped | unavailable | not-applicable
Fresh review: PASS | CHANGES_REQUIRED | NOT RUN — <findings> findings
Review repair: completed (when applicable) — one finding repaired; repaired candidate was not independently re-reviewed
Remote CI: not awaited after PR creation
Pull request: <URL or not-created>
Final status: ACCEPTED | BLOCKED | FAILED
```

`Review repair` is emitted only when the one allowed repair was recorded;
`Remote CI` is emitted for `PR` receipts, and a `GUIDED` receipt may omit that
PR-specific line.

Receipts render the latest relevant status for every planned check. The
executable gate retains the default receipt at `$STATE/receipt.md` and records
that run-local path in `receipt_ref`; an explicit output path may replace it.

Record a model provider separately only when a safe public label is available.
Omit unavailable metadata rather than guessing, and never publish credentials,
private paths, raw transcripts, or private ticket details.

## Required evidence

`ACCEPTED` requires a clean non-protected branch, a baseline ancestor, at least
one checkpoint, every required and applicable conditional final check passing
for the exact current candidate fingerprint, fresh review `PASS` for the exact
current `HEAD` and fingerprint or one recorded review repair with affected
validation, and a PR URL in `PR` mode.

For `PR`, every recorded implementation or review-repair checkpoint must be
bound to a materializing commit before delivery. The agent may use one or more
coherent checkpoints and commits; no predeclared commit sequence is required.
Final acceptance and receipt generation consume the current candidate-bound
validation and either PASS review evidence or the recorded repair evidence;
they do not rerun unchanged validation or another review. PR creation does not
add a remote validation requirement.

The read-only `receipt-verify` operation compares the receipt with the current
repository identity, branch, `HEAD`, final candidate fingerprint, and final
evidence state. A receipt created before a later commit, same-path edit,
untracked-content change, or replacement file is stale and must be rejected.

A receipt reports failed, skipped, unavailable, not-applicable, or missing
evidence explicitly. It never infers success from worker summaries and cannot
be hand-edited to upgrade a status.
