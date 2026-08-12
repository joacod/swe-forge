# Executable Evidence and Receipt Policy

## Objective

Make safety-critical workflow boundaries executable without pretending that a
shell helper can enforce agent reasoning. The canonical helper is:

```text
.swe-forge/tools/swe-forge-gate
```

It is dependency-free, can be used by an adapter or a repository checkout, and
keeps its evidence ledger outside the repository or under an already ignored
`.swe-forge/runs/` path. The ledger is a supporting evidence artifact, not a
replacement for the canonical run-state contract.

## Commands

Run the commands from a clean, classified checkout and use a fresh temporary
state directory for each run:

```sh
.swe-forge/tools/swe-forge-gate preflight --state "$STATE" --branch "$BRANCH"
.swe-forge/tools/swe-forge-gate validate \
  --state "$STATE" --requirement required --name "structural checks" -- \
  ./scripts/check-swe-forge
.swe-forge/tools/swe-forge-gate checkpoint \
  --state "$STATE" --scope .swe-forge/policies/** --scope README.md
.swe-forge/tools/swe-forge-gate commit-slice \
  --state "$STATE" --checkpoint 1 --message "Document evidence policy" \
  --authorized-by PR
.swe-forge/tools/swe-forge-gate review \
  --state "$STATE" --result PASS --source fresh-context
.swe-forge/tools/swe-forge-gate deliver-pr --state "$STATE"
```

The command boundaries are intentionally separate:

- `preflight` rejects dirty, detached, protected, or branch-drifted checkouts
  and records the baseline.
- `validate` executes one inspected local check, records its exit status, and
  stores command output outside the repository. Use `--final` for every
  required or conditional check run against the final HEAD.
- `checkpoint` records changed paths and requires them to stay within the
  declared scope with passing required and conditional evidence.
- `commit-slice` stages only the paths recorded by a passing checkpoint and
  requires explicit `PR` or guided `GO` authorization. It never pushes.
- `review` records only the structured review result and finding counts; it
  does not accept a review based on a transcript.
- `deliver-pr` checks the final clean branch, current-HEAD validation, review,
  and checkpoint evidence before external push or pull-request actions. It
  never pushes or creates a pull request.
- `receipt` renders a compact Markdown receipt without command output or
  transcripts. A PR receipt requires the created PR URL.

Inspect every validation command for migrations, deployment, publication,
credentials, production access, or shared-environment effects before running
it. The helper records command results; it does not authorize external effects.

## Receipt rules

A generated receipt may contain:

```text
## SWE Forge receipt
Execution: SOLO
Delivery: PR
Base: abc123
Commits: 4 (4 validated slices)
Verification:
- unit tests: passed
- lint: passed
Fresh review: PASS — 2 findings, 2 repaired
Pull request: https://github.com/example/project/pull/1
Final status: ACCEPTED
Merge performed: no
```

The helper reports `BLOCKED` rather than `ACCEPTED` when required or
conditional final checks are missing or failing, the checkout is dirty, the
review is not `PASS` for the current HEAD, the branch is unsafe, or a PR URL is
missing for `PR` delivery. Skipped and unavailable checks remain visible and do
not become passes.

Receipts are public evidence summaries, not proof that the review was
independent or that a remote check passed. They must be generated from the
ledger and actual Git state, contain no transcripts or secrets, and never be
hand-edited to upgrade their status. The canonical run state remains the source
of truth for topology, authorization, worker state, and recovery.
