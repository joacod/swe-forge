# Evidence Policy

The executable evidence helpers are:

```text
.swe-forge/tools/swe-forge-gate
.swe-forge/tools/swe-forge-state
```

Run state is authoritative for continuation. Keep validation logs and status
records outside the repository or under ignored `.swe-forge/runs/`.

## Checks and candidate binding

Record checks when run; do not preregister a plan or prove a procedural sequence.
Typical actions are:

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

`validate` and `record-check-status` record requirement, result, command or
reason, and `HEAD` before and after. Final checks run against a clean committed
candidate and must leave it unchanged; a mutating command fails its evidence.
Required and applicable conditional checks must pass. Unavailable checks block;
informational results remain visible. The small run-state `validation` record
binds the aggregate result to a candidate; the ledger remains detailed authority.

For a committed candidate, full Git commit SHA is the only identity. Final
validation, review, and delivery use the same `HEAD`; no content fingerprint or
phase identity is needed. A repair creates a new commit, reruns affected checks,
and is reported as not independently re-reviewed.

The gate checks local evidence and prerequisites only. It never authorizes
migration, deployment, publication, credentials, production/shared-environment
access, destructive cleanup, push, PR creation, or merge.

## Delivery evidence

`review` records one fresh review and its candidate `HEAD` in run state. A
localized repair uses the run-state repair transition and cannot become another
review. `deliver-pr` requires a safe clean checkout, baseline ancestry, current
validation, and either a passing review for the same `HEAD` or a recorded repair
with current repaired validation.

Git history, validation results, review, the PR, and the final report are the
delivery evidence. No second delivery artifact is generated.
