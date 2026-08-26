# Evidence Policy

The executable helper keeps the small set of evidence that protects a
reviewable delivery:

```text
.swe-forge/tools/swe-forge-gate
.swe-forge/tools/swe-forge-state
```

Run state remains authoritative for workflow continuation. Validation logs and
status records belong outside the repository or under an already ignored
`.swe-forge/runs/` path.

## Checks and candidate binding

Record a check when it is run; do not preregister a plan or prove a procedural
sequence:

```sh
.swe-forge/tools/swe-forge-gate preflight --state "$STATE" \
  --branch "$BRANCH" --base "$BASE"
.swe-forge/tools/swe-forge-gate validate --state "$STATE" \
  --name "integrated checks" --requirement required --final -- \
  ./scripts/validate-swe-forge core
.swe-forge/tools/swe-forge-gate review --state "$STATE" \
  --result PASS --source fresh-context
.swe-forge/tools/swe-forge-gate deliver-pr --state "$STATE"
```

`validate` and `record-check-status` record the requirement, result, command or
status reason, and the Git `HEAD` before and after the check. A final check must
run against a clean committed candidate and must leave it unchanged. A command
that changes the candidate is recorded as failed rather than silently allowing
its evidence to drift. Required and applicable conditional final checks must
pass; unavailable checks block, while informational results remain visible.
The run-state `validation` record only binds the current aggregate result and
candidate to that ledger; the ledger remains the detailed authority.

For a committed candidate, the full Git commit SHA is the only candidate
identity. Final validation, review, and delivery must all refer to that same
`HEAD`; no content fingerprint or phase-specific identity is needed. A review
repair creates a new commit, reruns only affected final validation against its
new `HEAD`, and reports that the repaired candidate was not independently
re-reviewed.

The gate never authorizes migrations, deployment, publication, credentials,
production access, shared-environment effects, destructive cleanup, push, PR
creation, or merge. It only checks local evidence and delivery prerequisites.

## Delivery evidence

`review` records one fresh review result and its candidate `HEAD` directly in
run state. A concrete, localized repair is recorded through the run-state
review transition after its additional commit; it cannot be turned into
another review. `deliver-pr`
requires a safe clean checkout, baseline ancestry, current final validation,
and either a passing review for the same `HEAD` or a recorded repair whose
validation is current for the repaired `HEAD`.

Git history, validation results, the review result, the pull request, and the
final harness report are the durable delivery evidence. No second delivery
artifact is generated after the PR.
