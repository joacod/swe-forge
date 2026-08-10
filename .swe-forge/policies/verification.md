# Verification Policy

## Objective

Use evidence to determine whether the original ticket is safely accepted.
Verification is a required workflow phase even in `SOLO` mode, but its depth
must match the ticket's risk and observable surface.

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

## Independent Review

After verification, provide a fresh-context reviewer with the original ticket,
acceptance criteria, relevant architecture, final diff, and evidence. The
reviewer must use `../contracts/review.md` and assess correctness, regressions,
scope, error handling, compatibility, concurrency, security, performance, and
tests as relevant.

## Final Gate

Accept only when:

- every original acceptance criterion is addressed
- relevant quality gates pass
- critical and high-confidence correctness findings are resolved
- unintended changes are absent
- the final integrated diff has been inspected

When a gate cannot run, state why and leave the result as a risk rather than
claiming success.
