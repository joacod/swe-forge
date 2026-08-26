# Review Contract

This contract owns review result shape, finding fields, severity/confidence, and
blocking semantics. The reviewer role owns investigation. Use it for one fresh,
ticket-focused review of the clean committed candidate after final validation.
For that candidate, the full Git `HEAD` is the identity shared with validation
and delivery. The agent may use one or more coherent commits; individual
implementation commits do not receive separate reviews.

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
    review_basis: <supplied criterion, constraint, or relevant risk>
    evidence: <specific supporting reference>
    recommended_action: <smallest safe repair or validation>

deferred_followups:
  - id: F1
    observation: <useful but out-of-scope concern>
    reason_out_of_scope: <why it is not part of this review>
    suggested_next_step: <future action>
```

A passing result has an empty findings list:

```yaml
status: PASS
findings: []
```

## Scope and findings

The supplied `review_focus` is the assignment and must cover the complete
ticket-relevant acceptance surface. Every supplied criterion receives an
evidence-backed disposition before `PASS`. Findings require a supplied
criterion, explicit constraint, or concrete relevant risk; style preferences,
unrelated cleanup, and speculative improvements are deferred.

Critical findings always block. High-severity findings with high or medium
confidence block. Any high-confidence correctness, security, data-integrity,
or compatibility finding blocks regardless of severity. Medium/low findings
outside those rules may remain as explicit risks or follow-ups.

## Repair boundary

`CHANGES_REQUIRED` permits one focused repair only when the finding is concrete,
localized, and clearly repairable. The repair context contains the finding,
repair delta, directly affected criteria, and checks. For the root, unaffected `PASS` conclusions carry forward.
They must not be used to replay unrelated criteria or justify another review. The repaired candidate is validated and
reported as not independently re-reviewed. Fundamental, materially uncertain,
unsafe, or unrepairable findings block delivery.
