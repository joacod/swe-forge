# Evidence Policy

The executable helpers make candidate and authorization boundaries checkable
without replacing agent judgment:

```text
.swe-forge/tools/swe-forge-gate
.swe-forge/tools/swe-forge-state
```

Keep the evidence ledger outside the repository or under an already ignored
`.swe-forge/runs/` path. Run state remains authoritative for workflow state;
the ledger supports it.

## Checks and candidate binding

Register checks before execution:

```text
swe-forge-gate preflight --state STATE --branch BRANCH --base BASE
swe-forge-gate plan-check --state STATE --name NAME --requirement required
swe-forge-gate validate --state STATE --name NAME -- COMMAND [ARGS...]
swe-forge-gate checkpoint --state STATE --scope PATH...
swe-forge-gate commit-slice --state STATE --checkpoint N --message MESSAGE --authorized-by PR
swe-forge-gate review --state STATE --result PASS --source fresh-context
swe-forge-gate deliver-pr --state STATE
```

`plan-check`, `validate`, and `record-check-status` are the smallest check
interface. Required and applicable conditional checks must pass; unavailable
ones block. Informational results remain visible. `validate` rejects
unregistered names and binds a normal command to the candidate fingerprint.
Mutation-producing checks must declare their scope and bind the post-command
fingerprint.

A checkpoint records exact paths and fingerprint. `commit-slice` refuses
candidate, staged-tree, or path drift and never pushes. In PR mode, every
recorded implementation or review-repair checkpoint needs targeted validation
and a materializing commit before delivery. Final validation is current for the
delivered candidate; a repair reruns affected checks only.

The gate does not authorize migrations, deployment, publication, credentials,
production/shared-environment access, or destructive cleanup. It never launches
workers or external orchestration.

## Receipts

Receipts are private, generated from structured evidence and Git state, and
stored at `$STATE/receipt.md` by default. `contracts/receipt.md` owns their
shape. They contain the final `Head`, evidence fingerprint, and UTC generation
time, plus compact check, review, delivery, and status results—never
transcripts, logs, secrets, or private ticket content.

Receipt verification compares repository identity, branch, current `HEAD`,
candidate fingerprint, and final evidence. Later commits or same-path content
changes make a receipt stale. A receipt never upgrades blocked evidence. PR
creation and URL recording end the synchronous run; remote CI is external and
not awaited or polled.
