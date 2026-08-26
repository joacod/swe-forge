# Review Contract

This contract owns the review result structure, required finding fields,
severity and confidence semantics, review-attempt accounting, and canonical
result validation. The reviewer role owns how to investigate and reason; this
contract does not turn every review into a generic quality checklist.

Use this contract for an independent review after implementation and
verification. For `PR`, review the clean committed candidate after
implementation and final validation have passed. The agent may have made one or
more coherent commits; individual implementation commits do not require
independent review. The root supplies a bounded handoff and the reviewer
returns the focus and evidence used, not an implementation result or a transcript.

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
  mode: initial | focused
  goal: <single sentence describing what this review must establish>
  acceptance_criteria_checked:
    - id: <criterion ID or short label>
      result: satisfied | not-satisfied | unclear
      evidence: <diff, test, reproduction, or inspection evidence>
  relevant_architecture_decisions:
    - <decision relevant to the supplied review focus, or none>
  relevant_constraints:
    - <explicit constraint relevant to the supplied review focus, or none>
  relevant_quality_checks:
    - <repository practice or concrete risk relevant to the changed behavior>
  non_goals:
    - <unrelated cleanup, refactor, or future work explicitly left out>
  # Focused re-review only: carry forward the prior review's unaffected PASS
  # conclusions and disposition every supplied blocking finding.
  prior_blocking_findings:
    - id: <finding ID>
      disposition: resolved | remains | unclear
      evidence: <repair diff, affected behavior, or validation evidence>
  repair_delta:
    summary: <repair change that this focused review must inspect>
    files:
      - <changed file or symbol>

findings:
  - id: R1
    severity: critical | high | medium | low
    confidence: high | medium | low
    location: path/to/file.ts:42
    issue: >
      Explain the concrete problem and affected behavior.
    review_basis: >
      Identify the supplied acceptance criterion, explicit constraint, prior
      blocking finding, or concrete relevant risk that makes this in scope.
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

## Review input coverage

The supplied `review_focus` defines the review assignment; the canonical
review gate still owns the numeric attempt count:

- `mode: initial` means the focus contains the complete ticket-relevant
  acceptance surface. Every supplied criterion must receive a disposition with
  evidence before `PASS`; relevant quality checks are considered only when the
  change or focus implicates them.
- `mode: focused` means the focus contains the prior blocking findings, repair
  delta, directly affected acceptance criteria, directly affected quality
  checks, and the non-goals needed to prevent scope expansion. Every supplied
  focused criterion and prior blocking finding must receive a disposition with
  evidence before `PASS`; a `remains` or `unclear` prior blocker cannot
  accompany `PASS`.
- Previously established, unaffected `PASS` criteria do not need to be
  independently re-proven in focused mode. A focused result may raise a new
  finding only when it is introduced by the repair, revealed on the affected
  surface, or necessary to establish that a prior blocker is resolved.

The contract requires coverage of what the root supplied; it does not require unrelated criteria
or generic risk categories to be added to a focused review. The reviewer role determines which
supplied quality checks need investigation.

## Review budget

The normal candidate budget is two review executions total: one independent
review and, after repair plus affected validation, one focused re-review. Every
fresh reviewer-like pass uses the same canonical review gate and consumes one
attempt, even when its source is labeled investigation, debug review, or
another recovery activity. Ordinary debugging of an unrelated implementation or
test failure is not a review execution. A second `CHANGES_REQUIRED` result is a
blocking terminal review outcome for automatic recovery; preserve the findings
and report the safest next action instead of launching another pass.

## Findings and blocking semantics

Findings are reserved for issues that affect a supplied acceptance criterion,
explicit constraint, supplied prior blocking finding, or concrete relevant risk
in the changed behavior. Unrelated refactors, style preferences, speculative
enhancements, and future-session work belong in `deferred_followups` and do
not block a `PASS`.

Every finding must include severity, confidence, location when applicable,
issue, review basis, evidence, and recommended action. The review basis must
point to supplied scope rather than a generic checklist. A missing or unclear
required disposition is not a passing review.

Severity:

- `critical`: security, data integrity, compatibility, or correctness failure
  that makes acceptance unsafe;
- `high`: likely correctness or regression issue that should be repaired before
  acceptance;
- `medium`: meaningful risk, missing coverage, or maintainability issue that may
  require repair depending on scope; and
- `low`: limited impact or optional improvement.

Confidence:

- `high`: directly demonstrated by code, tests, reproduction, Git evidence, or
  clear requirement mismatch;
- `medium`: well-supported inference with a plausible affected path; and
- `low`: uncertain suggestion requiring confirmation.

Critical and high-severity findings with high confidence normally require
repair. Apply this blocking matrix consistently:

- every critical finding blocks until resolved or reclassified with evidence;
- a high-severity finding with high or medium confidence blocks; and
- any high-confidence correctness, security, data-integrity, or compatibility
  finding blocks regardless of severity.

Medium and low findings outside those rules may remain under `PASS` as explicit
risks or deferred follow-ups.

## Review result

Return `CHANGES_REQUIRED` when a blocking in-scope finding remains, with the
required fields above. Return `PASS` only when every supplied acceptance
criterion and focused prior blocking finding has a valid evidence-backed
disposition and no critical or blocking finding under this contract remains.
Unrelated criteria must not be pulled into scope merely because the review is a
second execution.
