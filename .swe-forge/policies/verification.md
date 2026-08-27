# Verification Policy

Verification supplies current evidence for the Acceptance Gate. It applies to
`SOLO` and `SUBAGENTS`; depth follows ticket risk and observable behavior.

## Testing decision

Prefer evidence in this order:

1. relevant regression or acceptance behavior;
2. targeted repository tests;
3. relevant typecheck, lint, build, static, or packaging checks;
4. focused reproduction or manual verification; and
5. code/diff inspection for scope and integration.

Code inspection alone does not prove changed behavior. Before implementation,
record behavior and public seam, existing coverage (or none), the smallest
approach—`regression`, `acceptance`, `characterization`, `existing-sufficient`,
`manual`, or `not-applicable`—and its rationale/residual risk. Use regression
for bugs, acceptance for behavior changes, characterization for preserving
refactors, manual evidence when no useful automated seam exists. TDD is
optional; trivial or documentation changes may be `not-applicable`.

## Validation selection

Select the smallest groups covering the changed surfaces. Run final validation
once against the exact clean committed `HEAD`; after a repair, rerun only
affected groups. Reserve `full` for CI, release preparation, high-risk
cross-cutting work, or another justified broad risk.

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

```text
./scripts/validate-swe-forge core
./scripts/validate-swe-forge pi workers
./scripts/validate-swe-forge full release
```

With no group, the script keeps the full bundle. The map is inspectable, not a
dependency resolver. Classify checks as `required`, `conditional`, or
`informational` before running them and inspect side effects. Isolate or
explicitly authorize migrations, deployment, publication, production/shared
services, credentials, and destructive cleanup. Commit, push, and PR creation
are delivery actions, not validation.

Report the exact action, scope/environment when material, result, evidence, and
follow-up. Distinguish passed, failed, skipped, unavailable, and not-applicable;
a skipped or unavailable required/applicable conditional check blocks acceptance.

## Review handoff

The ticket workflow decides whether review is required. When required, load the
reviewer role and `../contracts/review.md`. Verification supplies current
validation; the role and contract own review investigation and result shape.
The initial handoff carries the complete ticket-relevant `review_focus`; a
repair carries only its finding, criteria, and checks.

The single Acceptance Gate is in `SWE-FORGE.md`. Do not rerun unchanged work for
review, acceptance, or PR preparation, and do not await or poll remote CI after
PR creation.
