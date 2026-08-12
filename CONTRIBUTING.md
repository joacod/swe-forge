# Contributing to SWE Forge

Thanks for helping improve SWE Forge. The project is a portable workflow
specification layer, so changes should preserve the separation between the
canonical workflow and harness-specific projections.

## Before changing files

- Read `AGENTS.md` and the relevant canonical workflow, policy, contract, or
  provider files.
- Keep the original behavior and scope of the change explicit.
- Update canonical sources before adapters or documentation projections.
- Do not commit temporary run state, transcripts, credentials, or generated
  installation trees.
- Keep Herdr as an optional execution provider; it is not a topology.

## Validate locally

Run the repository checks from the project root:

```sh
./scripts/check-swe-forge
./scripts/test-swe-forge
./scripts/test-swe-forge-gate
sh -n scripts/lib/registry.sh scripts/swe-forge scripts/check-swe-forge scripts/test-swe-forge scripts/swe-forge-gate scripts/test-swe-forge-gate
git diff --check
```

Documentation-only changes still need the structural checks and a final diff
review. Changes to the installer or adapter registry should include focused
fixture coverage for the affected installation or verification behavior.

## Pull requests

Use a concise imperative title and explain what changed and why. Include the
commands that were actually run and distinguish skipped or unavailable checks
from passing checks. Keep pull requests focused; avoid opportunistic refactors.

SWE Forge does not merge pull requests automatically. Reviewers should inspect
the final diff, validation evidence, and any generated SWE Forge receipt before
merging.
