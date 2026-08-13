# Review Contract

Use this contract for independent review after implementation and verification.
Reviewers should receive the original ticket, a `review_focus` from the PR
working spec or a concise focus derived from the ticket for other modes,
acceptance criteria, relevant architecture decisions, final integrated diff,
and validation evidence, not the full implementer transcript. For isolated
execution, provider lifecycle state is scheduling evidence only; review the
integration branch, source-to-integration mappings, and actual Git state.

## Template

```yaml
status: PASS | CHANGES_REQUIRED

scope:
  topology: SOLO | SUBAGENTS | ISOLATED
  provider: NATIVE | HERDR | NONE
  provider_constraint: NONE unless topology is ISOLATED; NATIVE or HERDR only for ISOLATED
  parallel_strategy: NONE | COMPOSE
  integration_strategy: NONE | CHERRY_PICK
  delivery_mode: GUIDED | PR
  delivery_checkout:
    branch: <one integration/delivery branch or none>
    path: <integration worktree or none>
  integration_branch: <reference delivery_checkout.branch>
  integration_worktree: <reference delivery_checkout.path>
  worker_resources_reviewed: []

review_focus:
  goal: <single sentence describing what this review must establish>
  acceptance_criteria_checked:
    - id: <criterion ID or short label>
      result: satisfied | not-satisfied | unclear
      evidence: <diff, test, reproduction, or inspection evidence>
  relevant_quality_checks:
    - <repository practice or concrete risk relevant to the changed behavior>
  non_goals:
    - <unrelated cleanup, refactor, or future work explicitly left out>

findings:
  - id: R1
    severity: critical | high | medium | low
    confidence: high | medium | low
    location: path/to/file.ts:42
    issue: >
      Explain the concrete problem and affected behavior.
    review_basis: >
      Identify the acceptance criterion, explicit constraint, or concrete
      relevant risk that makes this an in-scope finding.
    evidence: >
      Cite the code, diff, test, reproduction, Git state, or missing requirement.
    recommended_action: >
      Describe the smallest safe repair or validation needed.

deferred_followups:
  - id: F1
    observation: >
      Describe a useful concern that is not required for this ticket's acceptance.
    reason_out_of_scope: >
      Explain why addressing it now would expand the declared review focus.
    suggested_next_step: >
      Name a future ticket, investigation, or explicit follow-up.

isolated_evidence:
  task_contracts_checked: []
  worker_results_checked: []
  source_to_integration_mappings_checked: []
  integration_order_basis: dependency-plan | other
  integrated_validation_checked: true | false | not-applicable
  wave_validation_checked: true | false | not-applicable
  environment_isolation_checked: true | false | not-applicable
  cleanup_checked: true | false | not-applicable
```

Use `PASS` with an empty `findings` list when no blocking finding remains:

```yaml
status: PASS
findings: []
```

## Review Areas

Review the supplied `review_focus` first. Confirm every listed acceptance
criterion with evidence, then inspect only quality areas that are relevant to
the changed behavior or an explicit constraint. Review all applicable areas:

- correctness and missing requirements
- regressions and compatibility
- error handling and edge cases
- unnecessary complexity, abstraction, and scope creep
- concurrency, dependency waves, and shared-artifact ownership
- provider and harness boundaries
- exact worker base SHAs, branch/worktree identity, and clean checkouts
- source-to-integration commit mappings and planned integration order
- environment resource isolation and external-effect authorization
- security and sensitive-data boundaries when relevant
- performance implications when relevant
- test quality and missing integrated validation
- unrelated or accidental modifications
- one integration/delivery branch and one final PR boundary
- conservative cleanup that never force-removes ambiguous resources

A reviewer must confirm that provider and strategy fields obey their
conditional topology constraint: non-isolated runs use `NONE`, while isolated
runs use a selected provider, `COMPOSE`, and `CHERRY_PICK`. The reviewer must
also confirm that completion order did not determine integration
order, worker branches were not published, and final commits were constructed
and validated centrally when `ISOLATED` applies.

Findings are reserved for issues that affect an acceptance criterion, explicit
constraint, or concrete relevant risk in the changed behavior. Unrelated
refactors, style preferences, speculative enhancements, and future-session
work belong in `deferred_followups`, not `findings`, and do not block a `PASS`.

## Severity

- `critical`: security, data integrity, compatibility, or correctness failure
  that makes acceptance unsafe
- `high`: likely correctness or regression issue that should be repaired before
  acceptance
- `medium`: meaningful risk, missing coverage, or maintainability issue that
  may require repair depending on scope and evidence
- `low`: limited impact or optional improvement

## Confidence

- `high`: directly demonstrated by code, tests, reproduction, Git evidence, or
  clear requirement mismatch
- `medium`: well-supported inference with a plausible affected path
- `low`: uncertain suggestion requiring confirmation

Critical and high-severity findings with high confidence normally require
repair. Apply this blocking matrix consistently:

- every critical finding blocks until resolved or reclassified with evidence
- a high-severity finding with high or medium confidence blocks
- any high-confidence correctness, security, data-integrity, or compatibility
  finding blocks regardless of severity
- medium and low findings outside those rules may remain under `PASS` as
  explicit risks
- low-confidence stylistic opinions do not block acceptance by themselves

## Review Result

Return `CHANGES_REQUIRED` when a blocking in-scope finding remains, with
severity, confidence, location, review basis, evidence, and recommended action.
Return `PASS` only when every listed acceptance criterion and required evidence
has been inspected and no critical or blocking finding under this contract
remains. `deferred_followups` may remain under `PASS`; they are not a reason to
expand the current ticket. A provider's settled lifecycle state alone is never
enough for `PASS`.
