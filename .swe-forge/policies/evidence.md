# Executable Evidence and Receipt Policy

## Objective

Make safety-critical workflow boundaries executable without pretending that a
shell helper can enforce agent reasoning. The canonical helpers are:

```text
.swe-forge/tools/swe-forge-gate
.swe-forge/tools/swe-forge-isolated-gate
.swe-forge/tools/swe-forge-state
```

They are dependency-free. The evidence ledger belongs outside the repository or
under an already ignored `.swe-forge/runs/` path and supports, but does not
replace, canonical run state.

## Planned validation and exact content

Register the expected checks before executing them:

```sh
.swe-forge/tools/swe-forge-gate preflight --state "$STATE" --branch "$BRANCH" --base "$BASE"
.swe-forge/tools/swe-forge-gate plan-check --state "$STATE" \
  --name "structural checks" --requirement required --final-required false \
  --condition always
.swe-forge/tools/swe-forge-gate validate --state "$STATE" \
  --name "structural checks" -- ./scripts/check-swe-forge
.swe-forge/tools/swe-forge-gate checkpoint --state "$STATE" \
  --scope .swe-forge/policies/** --scope README.md
.swe-forge/tools/swe-forge-gate commit-slice --state "$STATE" \
  --checkpoint 1 --message "Document evidence policy" --authorized-by PR
.swe-forge/tools/swe-forge-gate review --state "$STATE" \
  --result PASS --source fresh-context
.swe-forge/tools/swe-forge-gate deliver-pr --state "$STATE"
```

The smallest interface is `plan-check`, `validate`, and
`record-check-status`. A required check must pass. An applicable conditional
check must pass; it may be recorded as not applicable only with a reason. An
unavailable required or applicable conditional check blocks. Informational
checks remain visible and do not block. `validate` and
`record-check-status` reject unregistered check names. Receipts render the
latest status per planned check; attempt history remains private.

Use `--final-required false` for a targeted check owned by the current
implementation slice and the default `--final-required true` for final checks.
Final-only checks may be registered before implementation, but slice
checkpoints evaluate only the slice-local checks; this avoids forcing a full
repository run before every commit. A checkpoint records which slice checks
passed. Later checkpoints do not require an earlier slice check to match the
new candidate fingerprint, but every new slice still needs current evidence.
Final checks always require an exact current-candidate result. This keeps
per-slice commits independent without weakening the final evidence gate.

`validate` records the candidate fingerprint before and after the command. A
normal command that changes candidate source content fails evidence binding. A
mutation-producing check must declare its mutation scope and reason and binds
to the post-command fingerprint. The deterministic fingerprint includes current
`HEAD`, candidate path/type/mode/content records, deletions, renames exposed by
Git, sorted untracked paths, and content hashes. It is computed with Git-native
and POSIX tools and is not a changed-path list. The gate uses a checksum marker
to avoid repeating the full run-state schema scan when the state file is
unchanged; candidate fingerprints and validation commands are never skipped.

A checkpoint records its exact path boundary and candidate fingerprint.
Required current-slice and applicable conditional checks must pass for that
candidate. `commit-slice` refuses candidate fingerprint drift, staged-tree
drift, and path set drift. It never pushes.

The guard stores command output outside the repository and does not authorize
migrations, deployment, publication, credentials, production access, or shared
environment effects. It never launches agents or providers.

## Receipts

Receipts are generated only from structured evidence and actual Git state. They
include:

```text
Head: <short final SHA>
Evidence fingerprint: <short final fingerprint>
Generated at: <UTC timestamp>
```

`receipt-verify` is read-only and compares repository identity, current branch,
current `HEAD`, current candidate fingerprint, and final evidence. A receipt
created before a later commit or same-path content change is stale. Receipts
never contain transcripts, raw logs, secrets, or private ticket content and
never upgrade a blocked status by hand.

## Isolated guard

`.swe-forge/tools/swe-forge-isolated-gate` is a narrow Git/evidence helper. It
initializes isolated evidence state, registers actual integration and worker
worktrees, validates the fixed worker-result bundle, enforces planned order,
checks integration drift, applies a documented `cherry-pick --no-commit`
transfer, records conflicts and source-to-integration mappings, reports
recoverable state, and verifies cleanup eligibility. It does not control Herdr,
launch agents, schedule work, push, create PRs, publish, deploy, merge, or
force-clean.
