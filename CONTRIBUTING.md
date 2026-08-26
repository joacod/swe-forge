# Contributing to SWE Forge

Thanks for helping improve SWE Forge. The project is a harness-agnostic coding
workflow with a portable canonical core, so changes should preserve the
separation between canonical workflow and asymmetric harness projections.
Support tiers describe maintenance and validation confidence; they do not
establish semantic priority or require parity work.

## Before changing files

- Read `AGENTS.md` and, for substantive canonical or boundary changes, read
  `docs/architecture.md` before the relevant workflow, policy, or contract
  files. For adapter work, also read `docs/adding-a-harness.md`,
  `.swe-forge/adapters/README.md`, and the target adapter README.
- Keep the original behavior and scope of the change explicit.
- Update canonical sources before adapters or documentation projections.
- Do not commit temporary run state, transcripts, credentials, or generated
  installation trees.
- Keep canonical logic capability-oriented rather than branching on harness
  identity. Harness-specific APIs and lifecycle behavior belong in adapters,
  and missing optional capabilities must use the canonical fallback.
- Treat projection/fixture validation and live harness validation as separate
  evidence. Do not claim parity because an adapter has not been exercised.

## Validate locally

Run repository checks from the project root. The no-argument command remains
the full fixture bundle:

```sh
./scripts/validate-swe-forge
# Or use --serial when tracing a fixture failure.
# ./scripts/validate-swe-forge --serial full
```

For implementation and final delivery, select only the groups affected by the
change. Inspect the available groups with `./scripts/validate-swe-forge --list`
or preview a selection with `--plan`:

```sh
./scripts/validate-swe-forge core
./scripts/validate-swe-forge evidence invocation
./scripts/validate-swe-forge full release  # release candidate
```

The groups are `core`, `invocation`, `evidence`, `installer`, `pi`, `omp`,
`workers`, and `release`; `full` selects the existing core, parser, evidence,
installer, adapter, and worker fixture bundle. Independent selected suites may
run in parallel where appropriate, and any required suite failure causes
validation to fail. A report identifies selected checks and checks not run.
Use `full` for CI, high-risk cross-cutting changes, or another justified broad
risk rather than assuming every final change needs every runtime and installer
fixture. `git diff --check` remains a separate repository check.

The local Pi fixture may report `SKIP` when the installed Node runtime cannot
execute TypeScript; the dedicated `pi-runtime` CI job pins a supported Node
version and treats that condition as a failure.

Documentation-only changes still need structural checks and final diff review.
Changes to the evidence gate, run-state validator, conformance fixture, or
release checker also require their executable fixtures and
`./scripts/check-release prepare`. Changes to the installer or adapter registry
should include focused fixture coverage for the affected installation or
verification behavior.

## Pull requests

Use a concise imperative title and explain what changed and why. Include the
commands actually run and distinguish skipped or unavailable checks from
passing checks. Keep pull requests focused; avoid opportunistic refactors.

SWE Forge does not merge pull requests automatically. Reviewers should inspect
the final diff and relevant project-level validation evidence before merging.
Receipts are private run artifacts; never paste them or other Forge workflow
metadata into a pull-request description.
