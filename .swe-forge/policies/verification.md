# Verification Policy

## Objective

Use evidence to determine whether the original ticket is safely accepted.
Verification is a required workflow phase even in `SOLO` mode, but its depth
must match the ticket's risk and observable surface. Delivery mode changes when
human checkpoints occur, not the evidence required for acceptance.

## Evidence Order

Prefer evidence in this order:

1. behavior observed through a relevant regression or acceptance test
2. targeted repository tests covering the changed behavior
3. typecheck, lint, build, static analysis, or packaging checks where relevant
4. focused reproduction or manual verification when automated checks are not
   available
5. code and diff inspection for scope, integration, and accidental changes

Code inspection alone cannot establish that a relevant behavior works.

## Strategy Selection

- bug: reproduce and establish a regression test when practical
- behavior change: test observable acceptance behavior
- refactor: establish a green baseline and preserve behavior incrementally
- security-sensitive change: validate the relevant trust boundary and failure
  paths
- performance-sensitive change: compare a representative workload or profile
- documentation or trivial change: use focused checks and diff review without
  ceremonial test scaffolding
- `GUIDED` checkpoint: validate the completed slice and label final acceptance
  as pending until the whole ticket is integrated
- `PR` delivery: use targeted validation for each implementation slice when
  useful, commit coherent slices as they are completed, then establish final
  evidence and perform one independent review of the committed candidate before
  delivery; after the PR exists, remote CI is external and is not awaited by
  this workflow

### Validation cadence and batching

Use targeted checks for each implementation slice.
Before delivery, select the smallest final validation groups that cover the
affected surfaces. Do not treat the complete repository bundle as the default
final check for every ticket.
Run final validation once the implementation candidate is complete. If a review
repair materially changes the candidate, rerun the groups affected by that
repair and establish current final evidence for delivery. Do not rerun an
unchanged broad or full suite merely because a checkpoint, commit, review,
acceptance, or PR-preparation boundary was reached. Later gates consume current
evidence rather than repeating its semantic work.

The repository's validation entry point exposes this small, static group map:

| Group | Covers | Typical final use |
| --- | --- | --- |
| `core` | shell syntax, structural checks, the selection fixture, and the canonical boundary fixture | canonical files, scripts, policies, contracts, or repository structure |
| `invocation` | invocation parser fixture | reserved invocation tokens or parser behavior |
| `evidence` | executable evidence-gate and run-state fixtures | evidence, checkpoints, receipts, or state semantics |
| `installer` | installer lifecycle and rollback fixtures | installer, registry, or installation projection changes |
| `pi` | Pi adapter/runtime fixture | Pi prompts, extensions, or runtime behavior |
| `omp` | OMP adapter/runtime fixture | OMP prompts, extensions, or runtime behavior |
| `workers` | worker briefing and worker-result contract fixtures | worker briefs, result schemas, or delegation contracts |
| `release` | release consistency/readiness check | release preparation; normally combine it with `full` |
| `full` | the existing core, invocation, evidence, installer, Pi, OMP, and worker bundle | CI, high-risk cross-cutting changes, or genuinely broad changes |

Use, for example, `./scripts/validate-swe-forge core` for a narrow core
change, `./scripts/validate-swe-forge pi workers` for coupled adapter and
worker-contract work, and `./scripts/validate-swe-forge full release` for a
release candidate. Calling the script with no group remains the obvious full
bundle for compatibility, but workflow selection must be based on the changed
surface. `full` is reserved for CI, release preparation, high-risk
cross-cutting work, or another justified broad risk. `--plan` shows the checks
that would run without executing them. The normal report identifies selected
and unselected checks. The group mapping
is intentionally understandable by inspection; it is not a dependency
resolver or build system.

When independent selected checks share the same candidate and have no shared
runtime or filesystem state, run them through one inspected batch. A batch is
only a scheduling optimization: it must preserve the identity and result of
every check, report every failure, skip, unavailable check, and unselected
check truthfully, and return failure if any required check fails. It must not
replace current-HEAD fingerprint binding, targeted slice evidence, or final
review.

### Testing Decision

For every ticket, record a concise testing decision before implementation:

- the observable behavior being changed and the public seam or boundary that
  provides confidence
- relevant existing tests, or evidence that none were found
- the smallest useful approach: regression, acceptance, characterization,
  existing-sufficient, manual, or not-applicable
- whether test-first development is useful, selected, or not applicable
- a rationale and residual risk when no new automated test is added
- for documentation or trivial work, record `not-applicable` when no
  meaningful behavior or test seam exists

A behavior change needs a relevant automated test or an executed focused
manual or reproduction check. Existing coverage is sufficient when it actually
protects the changed behavior. No blanket coverage percentage is required, and
TDD is not mandatory. When test-first is selected, use one public seam and one
minimal red-green-refactor slice at a time; do not write a speculative suite
upfront.

## Quality Gates

Choose and run applicable repository checks at their required boundary:

- targeted tests for the current implementation slice
- the `full` validation bundle when justified by scope or risk, normally at
  final integrated validation
- typecheck
- lint and formatting validation
- build or packaging
- static analysis or security checks
- repository-specific validation

The orchestrator must choose the checks based on repository instructions and
ticket risk. Do not run expensive checks without a reason, but do not omit a
relevant gate merely for speed.

Classify each check before execution:

- `required`: acceptance cannot succeed unless it passes
- `conditional`: required when its recorded observable condition applies
- `informational`: useful evidence that does not gate acceptance

Inspect each command for side effects. Local test artifacts and build output are
normal validation effects. Migrations, deployment, publication, production or
shared-service access, outbound messages, credential use beyond the local test
environment, and destructive cleanup require isolation or explicit user
authorization. Commit, push, pull-request creation, and post-merge
synchronization are delivery actions, not validation. A repository script name
is not evidence that these effects are authorized.

## Reporting

For each check, report:

- exact command or verification action
- scope and environment when material
- result: passed, failed, skipped, or unavailable
- concise evidence or failure summary
- follow-up action if not passed

Skipped and unavailable checks are not passes. A failed check remains part of
the final report even after a later repair unless the repaired run supersedes
it with clear evidence.

A required check that is skipped or unavailable blocks acceptance. When the
executable evidence gate is used, every required or applicable conditional final
check must be recorded against the final HEAD; an earlier passing result is not
sufficient after a commit. A substitute check is allowed only after the
validation plan or delegated task contract is updated with the reason.
Conditional and informational outcomes remain visible even when they do not
block acceptance.

## Independent Review Handoff

The ticket workflow decides when independent review is required. When it is,
load `.swe-forge/agents/reviewer.md` and `../contracts/review.md` before review.
Verification supplies current validation evidence; the reviewer role owns how
to investigate, and the contract owns result shape, coverage semantics,
severity, and blocking behavior.

The one review handoff uses the complete ticket-relevant initial
`review_focus`. If repair is needed, the root derives a separate focused repair
context with the prior finding, repair delta, directly affected criteria and
checks, and only the original context needed to interpret them. Unaffected
previous `PASS` conclusions carry forward for the root; no second reviewer
receives that context. Adapters forward the bounded handoff; they do not append
workflow policy, authorization, delivery, or transcript content.

## Acceptance handoff

Verification produces testing and quality evidence consumed by the canonical
Acceptance Gate in `SWE-FORGE.md`. This policy does not define a competing
final gate. Report unavailable or failed required evidence explicitly and let
the canonical gate determine whether the run is `ACCEPTED`, `BLOCKED`, or
`FAILED`; delivery authorization and receipt semantics remain owned by their
canonical policy and contract. A repaired candidate is accepted only with the
recorded repair and current affected validation, not a second review.
