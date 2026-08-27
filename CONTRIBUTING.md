# Contributing to SWE Forge

SWE Forge has a portable canonical core and asymmetric harness projections.
Preserve that boundary. Support tiers describe maintenance/evidence, not
semantic priority or parity.

## Before editing

- Read `AGENTS.md`; for canonical or boundary changes, also read
  `docs/architecture.md`. For adapters, read `docs/adding-a-harness.md`,
  `.swe-forge/adapters/README.md`, and the target adapter README.
- Keep ticket behavior and scope explicit. Update canonical sources before
  projections or other docs.
- Do not commit run state, transcripts, credentials, or generated installations.
- Keep core logic capability-oriented, not harness-branched. Host APIs and
  lifecycle belong in adapters; unavailable capabilities use canonical fallback.
- Separate projection/fixture evidence from live harness validation; do not
  claim parity without exercising the adapter.

## Local checks

Run from the project root. No arguments keeps the full fixture bundle:

```sh
./scripts/validate-swe-forge
./scripts/validate-swe-forge core
./scripts/validate-swe-forge evidence invocation
./scripts/validate-swe-forge full release
```

Use `--list` or `--plan` to inspect selection. Groups are `core`, `invocation`,
`evidence`, `installer`, `pi`, `omp`, `workers`, and `release`; `full` selects
all non-release groups. Use `full` for CI, high-risk cross-cutting work, or
release preparation. `git diff --check` is separate.

The local Pi fixture may skip when Node cannot execute TypeScript; CI pins Node
`22.19.0` and fails that condition. Documentation-only changes still need
structural checks and final diff review. Changes to gates, state validators,
conformance, release checks, installer, or registry need their focused fixtures.

## Pull requests

Use a concise imperative title, explain what and why, and list commands actually
run. Keep PRs focused. SWE Forge never merges automatically; reviewers inspect
the final diff and project-level evidence. Keep receipts and workflow metadata
out of PR descriptions.
