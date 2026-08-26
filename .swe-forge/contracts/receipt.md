# SWE Forge Receipt Contract

A receipt is a compact private run-evidence summary. It is generated from the
executable ledger and Git state; it is not run state, a review, or project-facing
PR content. Never copy transcripts, secrets, private ticket content, or receipt
metadata into a PR, commit, branch, or changelog.

## Shape

```text
## SWE Forge receipt
Execution: SOLO | SUBAGENTS
Delivery: GUIDED | PR
Run metadata: (optional)
- SWE Forge: <version>
- Harness: <name and version>
- Routing: <requested -> selected>
- Model provider: <safe public label>
Repository: <identity>
Base: <short SHA>
Branch: <delivery branch>
Head: <short final SHA>
Evidence fingerprint: <short final fingerprint>
Generated at: <UTC timestamp>
Commits: <validated slice and repair counts>
Verification:
- <registered check>: passed | failed | skipped | unavailable | not-applicable
Fresh review: PASS | CHANGES_REQUIRED | NOT RUN — <finding count>
Review repair: completed — one finding repaired; repaired candidate was not independently re-reviewed
Remote CI: not awaited after PR creation
Pull request: <URL or not-created>
Final status: ACCEPTED | BLOCKED | FAILED
```

Omit optional metadata when unavailable. `Review repair: completed` appears
only for the one recorded repair; the PR-only remote-CI line may be omitted for
GUIDED. The default receipt is `$STATE/receipt.md` and its path is recorded in
`receipt_ref`.

## Evidence rules

`ACCEPTED` requires a clean non-protected branch, baseline ancestry, at least
one checkpoint, every required/applicable final check passing for the exact
candidate, and either fresh review `PASS` or the one recorded repair with
affected validation. PR mode also requires its PR URL.

For PR, every recorded implementation or review-repair checkpoint has a
materializing commit. Final acceptance consumes current candidate-bound
validation and review/repair evidence; it does not rerun unchanged work or
another review. PR creation adds no remote validation requirement.

`receipt-verify` compares repository identity, branch, `HEAD`, candidate
fingerprint, and final evidence. Later commits, same-path edits, untracked
changes, or replacement files make a receipt stale. Missing, failed, skipped,
unavailable, and not-applicable evidence stays explicit; a receipt cannot be
hand-edited to upgrade status.
