# Review Contract

This contract owns the review result structure, required finding fields,
severity and confidence semantics, and canonical result validation. The
reviewer role owns how to investigate and reason; this contract does not turn
the review into a generic quality checklist.

Use this contract for one independent review after implementation and
verification. For `PR`, review the clean committed candidate after final
validation has passed. The agent may have made one or more coherent commits;
individual implementation commits do not receive independent review. The root
supplies a bounded handoff and the reviewer returns the focus and evidence used,
not an implementation result or a transcript.

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
  mode: initial
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

findings:
  - id: R1
    severity: critical | high | medium | low
    confidence: high | medium | low
    location: path/to/file.ts:42
    issue: >
      Explain the concrete problem and affected behavior.
    review_basis: >
      Identify the supplied acceptance criterion, explicit constraint, or
      concrete relevant risk that makes this an in-scope finding.
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

## Review scope

The supplied `review_focus` is the review assignment. For the initial review it
must contain the complete ticket-relevant acceptance surface. Every supplied
criterion must receive a disposition with evidence before `PASS`; relevant
quality checks are considered when the changed behavior or focus implicates
them. The original ticket remains the acceptance authority.

The root may carry previously established, unaffected `PASS` conclusions forward
in a focused repair context. That context is for one bounded repair, not a second
review, and it must not be used to replay unrelated criteria or justify another
review. A repair handoff contains only the prior finding, repair delta, directly
affected criteria, and affected validation.

## Findings and blocking semantics

Findings are reserved for issues that affect a supplied acceptance criterion,
explicit constraint, or concrete relevant risk in the changed behavior.
Unrelated refactors, style preferences, speculative enhancements, and
future-session work belong in `deferred_followups` and do not block a `PASS`.

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
criterion has a valid evidence-backed disposition and no critical or blocking
finding under this contract remains.

After `CHANGES_REQUIRED`, the root may apply one focused repair only when the
finding is concrete, localized, and clearly repairable. The repair must be
validated on its affected surface and explicitly reported as not independently
re-reviewed. A fundamental, materially uncertain, unsafe, or otherwise
unrepairable finding blocks delivery. A repair never authorizes another review.
