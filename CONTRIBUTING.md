# Contributing to SWE Forge

SWE Forge has a portable canonical core and asymmetric harness projections.
Preserve that boundary. Support tiers describe maintenance/evidence, not
semantic priority or parity.

## Runtime prerequisite

Install [Bun](https://bun.sh/) before running repository tools. The public
`scripts/swe-forge` command is a thin source-checkout wrapper around the
canonical TypeScript installer at `src/install/cli.ts`; Bun is also the runtime
for the typed validation coordinator, internal canonical tools, and tests.
Standalone release users do not need Bun, Node.js, or Python after receiving a
validated executable. Runtime package dependencies remain zero.

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
bun install --frozen-lockfile
bun run check:dependencies
bun run check:package
bun run typecheck
bun test
./scripts/swe-forge --version
./scripts/test-swe-forge
./scripts/validate-swe-forge core
./scripts/validate-swe-forge installer
./scripts/validate-swe-forge full release
```

Use `./scripts/swe-forge` for source-checkout ergonomics or invoke
`bun src/install/cli.ts ...` directly when checking the canonical installer.

Use `--list` or `--plan` to inspect selection. Groups are `core`, `invocation`,
`evidence`, `installer`, `pi`, `omp`, `workers`, and `release`; `full` selects
all non-release groups. Automatic PR CI uses the focused canonical groups
`core invocation installer workers` on Ubuntu. Main pushes, release tags, and
manual runs also use the standalone matrix on native macOS arm64 and Linux x64,
including release consistency, artifact, checksum, and clean-room checks. Use
`full` for high-risk cross-cutting work or explicit complete validation; use
`release` for release preparation. `git diff --check` is separate.

The Pi and OMP fixtures are opt-in local checks for adapter changes, not
automatic PR gates. They may skip when Node cannot execute TypeScript.
Documentation-only changes still need structural checks and final diff review.
Changes to gates, state validators, conformance, release checks, installer, or
registry need their focused fixtures.

## Pull requests

Use a concise imperative title, explain what and why, and list commands actually
run. Keep PRs focused. SWE Forge never merges automatically; reviewers inspect
the final diff and project-level evidence. Keep receipts and workflow metadata
out of PR descriptions.
