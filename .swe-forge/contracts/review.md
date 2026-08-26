# Review Contract

Use this contract for independent review after implementation and verification.
Reviewers should receive the original ticket, a `review_focus` from the PR
working spec or a concise focus derived from the ticket for other modes,
acceptance criteria, relevant architecture decisions, final diff, and
validation evidence, not the full implementer transcript.

## Template

```yaml
status: PASS | CHANGES_REQUIRED

scope:
  topology: SOLO | SUBAGENTS
  delivery_mode: GUIDED | PR
  delivery_checkout:
    branch: <canonical delivery branch or none>
    path: <canonical delivery checkout or none>

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
```

Use `PASS` with an empty `findings` list when no blocking finding remains:

```yaml
status: PASS
findings: []
```

## Review Areas

Review the supplied `review_focus` first. Confirm every listed acceptance
criterion with evidence, then inspect only quality areas relevant to the
changed behavior or an explicit constraint. Review all applicable areas:

- correctness and missing requirements;
- regressions, compatibility, error handling, and edge cases;
- unnecessary complexity, abstraction, and scope creep;
- sequential canonical materialization/acceptance and dependency handoffs;
- harness capability boundaries and safe fallback behavior;
- security and sensitive-data boundaries when relevant;
- performance implications when relevant;
- test quality and missing integrated validation; and
- unrelated or accidental modifications.

The reviewer must confirm that writable delegated results were materialized
into and validated against the canonical delivery candidate before sequential
acceptance, that the root retained integration and delivery ownership, and that
concurrent mutation of the candidate did not occur. A worker result or host
lifecycle status alone is never sufficient for `PASS`.

Findings are reserved for issues that affect an acceptance criterion, explicit
constraint, or concrete relevant risk in the changed behavior. Unrelated
refactors, style preferences, speculative enhancements, and future-session
work belong in `deferred_followups`, not `findings`, and do not block a `PASS`.

## Severity

- `critical`: security, data integrity, compatibility, or correctness failure
  that makes acceptance unsafe;
- `high`: likely correctness or regression issue that should be repaired before
  acceptance;
- `medium`: meaningful risk, missing coverage, or maintainability issue that may
  require repair depending on scope; and
- `low`: limited impact or optional improvement.

## Confidence

- `high`: directly demonstrated by code, tests, reproduction, Git evidence, or
  clear requirement mismatch;
- `medium`: well-supported inference with a plausible affected path; and
- `low`: uncertain suggestion requiring confirmation.

Critical and high-severity findings with high confidence normally require
repair. Apply this blocking matrix consistently:

- every critical finding blocks until resolved or reclassified with evidence;
- a high-severity finding with high or medium confidence blocks;
- any high-confidence correctness, security, data-integrity, or compatibility
  finding blocks regardless of severity; and
- medium and low findings outside those rules may remain under `PASS` as
  explicit risks.

## Review Result

Return `CHANGES_REQUIRED` when a blocking in-scope finding remains, with
severity, confidence, location, review basis, evidence, and recommended action.
Return `PASS` only when every listed acceptance criterion and required evidence
has been inspected and no critical or blocking finding under this contract
remains. `deferred_followups` may remain under `PASS`; they are not a reason to
expand the current ticket.
