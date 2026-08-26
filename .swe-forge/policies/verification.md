# Verification Policy

Verification supplies current evidence for the Acceptance Gate. It applies in
`SOLO` and `SUBAGENTS`; depth follows ticket risk and observable behavior.

## Evidence and testing

Prefer evidence in this order:

1. relevant regression or acceptance behavior;
2. targeted repository tests;
3. relevant typecheck, lint, build, static, or packaging checks;
4. focused reproduction or manual verification; and
5. code/diff inspection for scope and integration.

Code inspection alone does not prove changed behavior.

Before implementation, record one testing decision:

- behavior and public seam;
- relevant existing coverage, or none found;
- smallest useful approach: `regression`, `acceptance`, `characterization`,
  `existing-sufficient`, `manual`, or `not-applicable`; and
- rationale and residual risk when no automated test is added.

Use regression coverage for a bug when practical, acceptance coverage for a
behavior change, characterization for a behavior-preserving refactor, and
focused manual evidence when no useful automated seam exists. TDD is optional;
documentation and trivial changes may be `not-applicable`.

## Validation selection

Use targeted checks for an implementation slice. Run final validation once the
candidate is complete, against its exact current `HEAD`. After a repair, rerun
only affected groups. The workflow must select the smallest final validation groups.
`full` is reserved for CI, release preparation, high-risk cross-cutting work, or
another justified broad risk.

The validation entry point exposes this static map:

| Group | Covers |
| --- | --- |
| `core` | shell syntax, structural, selection, and boundary checks |
| `invocation` | invocation parser fixture |
| `evidence` | evidence-gate and run-state fixtures |
| `installer` | installer lifecycle and rollback fixtures |
| `pi` | Pi adapter/runtime fixture |
| `omp` | OMP adapter/runtime fixture |
| `workers` | worker-brief and worker-result fixtures |
| `release` | release consistency/readiness |
| `full` | core, invocation, evidence, installer, Pi, OMP, and workers |

For example:

```text
./scripts/validate-swe-forge core
./scripts/validate-swe-forge pi workers
./scripts/validate-swe-forge full release
```

With no group, the script preserves the full bundle. `--plan` shows checks
without running them. The map is inspectable, not a dependency resolver.

Classify each check as `required`, `conditional`, or `informational` before
running it. Inspect side effects; migrations, deployment, publication,
production/shared-service access, credentials, and destructive cleanup require
isolation or explicit authorization. Commit, push, and PR creation are delivery
actions, not validation.

Report the exact action, scope/environment when material, result, evidence, and
follow-up. Skipped or unavailable checks are not passes. A required or
applicable conditional check that is skipped or unavailable blocks acceptance.

## Independent Review Handoff

The ticket workflow decides whether review is required. When it is, load the
reviewer role and `../contracts/review.md`. Verification supplies current
validation evidence; the reviewer role owns investigation and the review
contract owns result shape and blocking semantics. The initial handoff uses the
complete ticket-relevant `review_focus`; a repair receives only its affected
finding, criteria, and checks.

## Acceptance handoff

This policy contributes testing and quality evidence to the one Acceptance Gate
in `SWE-FORGE.md`; it defines no competing gate. Do not rerun unchanged work
for review, acceptance, or PR preparation, and do not await or poll remote CI
after PR creation.
