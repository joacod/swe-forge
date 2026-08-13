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
- `PR` delivery: complete all required local checks and fresh review before
  commit, push, or pull-request creation

### Validation cadence and batching

Use targeted checks for each implementation slice and reserve complete
repository suites for the final integrated candidate unless a slice changes a
behavior that requires an earlier full check. Do not rerun an unchanged full
suite merely because another check or commit boundary was reached.

When independent checks share the same candidate and have no shared runtime or
filesystem state, run them through one inspected batch when the repository
provides one. A batch is only a scheduling optimization: it must preserve the
identity and result of every check, report every failure or unavailable check,
and return failure if any required check fails. It must not replace current-HEAD
fingerprint binding, targeted slice evidence, or final review.

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

Run applicable repository checks after integration:

- targeted tests
- full test suite when justified by scope or risk
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

## Independent Review

After verification, provide a fresh-context reviewer when the trigger in the
ticket workflow applies. Give the reviewer the original ticket, `review_focus`,
acceptance criteria, relevant architecture, final diff, and evidence. The
reviewer must check every acceptance criterion first, assess only the relevant
quality areas, and use `../contracts/review.md` to separate in-scope findings
from deferred out-of-scope follow-ups. Correctness, regressions, scope, error
handling, compatibility, concurrency, security, performance, and tests remain
review areas when relevant to the focus.

## Final Gate

Accept only when:

- every original acceptance criterion is addressed
- relevant quality gates pass
- no blocking finding under `../contracts/review.md` remains
- unintended changes are absent
- the final integrated diff has been inspected
- a requested `PR` delivery has completed its authorized commit, push, and PR
  actions, or is explicitly reported as `BLOCKED`

When a gate cannot run, state why and leave the result as a risk rather than
claiming success. In `PR` mode, an unavailable tool needed to create the
requested PR produces `BLOCKED` after preserving the reviewed local branch; it
must not be reported as a completed delivery. In `GUIDED`, an unavailable
optional delivery tool does not invalidate an accepted reviewed diff when no
delivery action was requested. A generated receipt must preserve the same
status and show missing or unavailable evidence explicitly.
