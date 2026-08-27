# Review Contract

This contract owns review result shape, finding fields, severity/confidence, and
blocking semantics. The reviewer owns investigation. Use it for one fresh,
ticket-focused review of the clean committed candidate after final validation.
The candidate's full Git `HEAD` is shared by validation, review, and delivery.

## Result shape

```yaml
status: PASS | CHANGES_REQUIRED

scope:
  topology: SOLO | SUBAGENTS
  delivery_mode: GUIDED | PR
  delivery_checkout:
    branch: <canonical branch or none>
    path: <canonical path or none>

review_focus:
  mode: initial
  goal: <single review objective>
  acceptance_criteria_checked:
    - id: <criterion ID or label>
      result: satisfied | not-satisfied | unclear
      evidence: <diff, test, reproduction, or inspection reference>
  relevant_architecture_decisions: [<decision or none>]
  relevant_constraints: [<constraint or none>]
  relevant_quality_checks: [<changed behavior or concrete risk>]
  non_goals: [<explicitly excluded work>]

findings:
  - id: R1
    severity: critical | high | medium | low
    confidence: high | medium | low
    location: <path and line, when applicable>
    issue: <concrete problem and affected behavior>
    review_basis: <criterion, constraint, or relevant risk>
    evidence: <specific supporting reference>
    recommended_action: <smallest safe repair or validation>

deferred_followups:
  - id: F1
    observation: <useful out-of-scope concern>
    reason_out_of_scope: <why it is not reviewed>
    suggested_next_step: <future action>
```

A passing result has no findings:

```yaml
status: PASS
findings: []
```

## Scope and findings

The supplied `review_focus` is the complete assignment. Disposition every
criterion with evidence before `PASS`. Findings require a supplied criterion,
explicit constraint, or concrete relevant risk; style preferences, unrelated
cleanup, and speculation are follow-ups.

Critical findings block. High-severity findings with high or medium confidence
block. Any high-confidence correctness, security, data-integrity, or
compatibility finding blocks regardless of severity. Other medium/low findings
may remain as explicit risks or follow-ups.

## Repair boundary

`CHANGES_REQUIRED` permits one focused repair only when concrete, localized, and
clearly repairable. The repair context contains the finding, repair delta,
affected criteria, and checks; unaffected `PASS` conclusions carry forward.
Validate the repaired candidate and report that it was not independently
re-reviewed. Fundamental, materially uncertain, unsafe, or unrepairable
findings block delivery.
