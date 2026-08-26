# Executable Evidence and Receipt Policy

## Objective

Make safety-critical workflow boundaries executable without pretending that a
shell helper can enforce agent reasoning. The canonical helpers are:

```text
.swe-forge/tools/swe-forge-gate
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
  --name "targeted checks" --requirement required --final-required false \
  --condition always
.swe-forge/tools/swe-forge-gate validate --state "$STATE" \
  --name "targeted checks" -- ./scripts/check-swe-forge
.swe-forge/tools/swe-forge-gate checkpoint --state "$STATE" \
  --scope .swe-forge/policies/** --scope README.md
.swe-forge/tools/swe-forge-gate commit-slice --state "$STATE" \
  --checkpoint 1 --message "Document evidence policy" --authorized-by PR
.swe-forge/tools/swe-forge-gate plan-check --state "$STATE" \
  --name "integrated checks" --requirement required
.swe-forge/tools/swe-forge-gate validate --state "$STATE" \
  --name "integrated checks" --final -- ./scripts/validate-swe-forge core
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
latest status per planned check; validation history remains private.

In `PR`, implementation checkpoints and commits are boundaries chosen as the
work develops. Every recorded checkpoint must have matching candidate,
path, validation, and commit evidence before `deliver-pr`; a review-repair
checkpoint and commit use the explicit repair kind and are followed by affected
validation.

`deliver-pr` and receipt generation inspect only local checkout, validation,
review, validation, and authorization evidence. Final validation evidence is
established after implementation is complete, and again only when a repair
changes the candidate; affected validation, acceptance, and PR preparation
consume that exact evidence without rerunning unchanged commands. Creating the
PR and recording its URL ends the synchronous run; remote CI is not awaited or
polled.

Use `--final-required false` for a targeted check owned by the current
implementation slice and the default `--final-required true` for final checks.
Final checks may be registered before implementation, but slice checkpoints
evaluate only slice-local checks. Final checks always require an exact current
candidate result.

`validate` records the candidate fingerprint before and after the command. A
normal command that changes candidate source content fails evidence binding. A
mutation-producing check must declare its mutation scope and reason and binds
to the post-command fingerprint. The deterministic fingerprint includes current
`HEAD`, candidate path/type/mode/content records, deletions, renames exposed by
Git, sorted untracked paths, and content hashes.

A checkpoint records its exact path boundary and candidate fingerprint.
Required current-slice and applicable conditional checks must pass for that
candidate. Implementation checkpoints need only their targeted checks; final
checks are evaluated at the final-candidate boundary. `commit-slice`
refuses candidate fingerprint drift, staged-tree drift, and path set drift. It
never pushes.

The guard stores command output outside the repository and does not authorize
migrations, deployment, publication, credentials, production access, or shared
environment effects. It never launches workers or external orchestration.

## Receipts

Receipts are generated only from structured evidence and actual Git state. They
are private run-evidence artifacts by default, not project-facing PR content.
When no output path is supplied, the executable gate writes the receipt to
`$STATE/receipt.md`, prints it, and records that path in run state.
`receipt --verify --state "$STATE"` and `receipt-verify --state "$STATE"` use
that run-local receipt by default.

They include:

```text
Head: <short final SHA>
Evidence fingerprint: <short final fingerprint>
Generated at: <UTC timestamp>
```

`receipt-verify` is read-only and compares repository identity, current branch,
current `HEAD`, current candidate fingerprint, and final evidence. A receipt
created before a later commit or same-path content change is stale. Receipts
never contain transcripts, raw logs, secrets, or private ticket content and
never upgrade a blocked status by hand. A model provider is optional metadata
in the private receipt; it is not a workflow or routing decision. Never copy
receipt content or workflow metadata into a pull-request description, commit
message, or branch name.
