# Contributing to SWE Forge

Thanks for helping improve SWE Forge. The project is a Pi-first coding
workflow with a portable canonical core, so changes should preserve the
separation between the canonical workflow and asymmetric harness projections.
Pi is the reference harness; new Pi capabilities do not require parity work in
experimental adapters.

## Before changing files

- Read `AGENTS.md` and the relevant canonical workflow, policy, contract, or
  provider files.
- Keep the original behavior and scope of the change explicit.
- Update canonical sources before adapters or documentation projections.
- Do not commit temporary run state, transcripts, credentials, or generated
  installation trees.
- Keep Herdr as an optional execution provider; it is not a topology.
- Keep canonical logic capability-oriented rather than branching on harness
  identity. Harness-specific APIs and lifecycle behavior belong in adapters,
  and missing optional capabilities must use the canonical fallback.
- Treat projection/fixture validation and real harness validation as separate
  evidence. Do not delete an experimental adapter or claim parity because it
  has not yet been exercised.

## Validate locally

Run the repository checks from the project root:

```sh
./scripts/validate-swe-forge
# Or use --serial when tracing a fixture failure.
# ./scripts/validate-swe-forge --serial
git diff --check
```

The validation batch runs syntax and structural checks first, then the
repository's current independent fixture and validation suites. Independent
suites may run in parallel where appropriate, and any required suite failure
causes validation to fail; the batch does not weaken the final quality gate.
During an implementation loop, use only the focused suite affected by the
current slice and run the batch once on the final candidate. Focused changes may
run the directly affected suite, such as
`scripts/test-swe-forge-gate`, `scripts/test-swe-forge-isolated`,
`scripts/test-swe-forge-pi`, `scripts/test-swe-forge-invocation`,
`scripts/test-swe-forge-briefing`, `scripts/test-swe-forge-results`, or
`scripts/test-swe-forge-boundary`, before the
final batch. The local Pi fixture may
report `SKIP` when the installed Node runtime cannot execute TypeScript; the
dedicated `pi-runtime` CI job pins a supported Node version and treats that
condition as a failure.

Documentation-only changes still need the structural checks and a final diff
review. Changes to the evidence gate, isolated guard, run-state validator,
conformance fixture, or release checker also require their executable fixtures
and `./scripts/check-release prepare`. Changes to the installer or adapter registry should include focused
fixture coverage for the affected installation or verification behavior.

## Pull requests

Use a concise imperative title and explain what changed and why. Include the
commands that were actually run and distinguish skipped or unavailable checks
from passing checks. Keep pull requests focused; avoid opportunistic refactors.

SWE Forge does not merge pull requests automatically. Reviewers should inspect
the final diff and relevant project-level validation evidence before merging.
Receipts are private run artifacts; never paste them or other Forge workflow
metadata into a pull-request description.
