# Ephemeral Working Spec Contract

A working spec is a short PR planning artifact. The original ticket remains
authoritative; this spec makes its intent, boundaries, evidence, and review
scope executable without creating project documentation.

## Storage

Keep it in active context or in the run's restricted temporary directory. Never
commit it, write it into the repository, or add an ignore rule for it. Delete
external copies during cleanup. Run state, not this spec, owns continuation;
worker dependency digests are derived at launch and do not belong here.

## Minimum shape

Do not fill ceremonial sections. A ready spec normally contains only:

```yaml
spec_version: 1
status: draft | ready | revised
source_ticket: <immutable raw invocation or reference>

goal: <user-visible outcome>

scope:
  in:
    - <affected behavior or surface>
  out:
    - <explicit non-goal>

acceptance:
  - id: R1
    check: <observable condition>
  - id: R2
    check: <observable condition>

approach: <smallest compatible implementation approach>
risks:
  - <meaningful risk and mitigation>

validation:
  testing: <concise testing decision, or not-applicable>
  checks:
    - command: <command or manual check>
      requirement: required | conditional | informational
      condition: <when it applies>
      side_effects: local-only | external-read | external-write | destructive

review_focus:
  mode: initial
  goal: <one-sentence review objective>
  acceptance_criteria_checked: [R1, R2]
  relevant_architecture_decisions: [<decision affecting review, when any>]
  relevant_constraints: [<ticket constraint>]
  relevant_quality_checks: [<changed behavior or concrete risk>]
  non_goals: [<out-of-scope work>]
  finding_rule: <what makes a finding actionable>
```

`scope.out`, `risks`, and the review lists may be omitted when genuinely empty;
acceptance must remain observable. For a behavior change, expand `testing` with
its behavior, seam, existing coverage, approach, and rationale. Add
`assumptions` or `open_questions` only when they affect safe implementation. Add a bounded `discovery_strategy` only
when read-only discovery leaves the root; add routing facts only when needed to
explain a topology decision. Delivery authorization and continuation belong to
run state and the delivery policy, not this spec.

## Readiness

A `ready` spec has a concrete goal, bounded scope, observable acceptance,
smallest compatible approach, meaningful risks when present, a testing decision,
selected validation, and an initial review focus covering every ticket-relevant
criterion and constraint. It may omit an interview when the ticket already
provides those facts. Ask the user about blocking intent, compatibility, risk,
or external-action decisions; record low-risk assumptions instead.

The initial `review_focus` is the sole structured review scope. It may reference
acceptance IDs instead of copying their prose. After a concrete, localized,
clearly repairable finding, create a separate transient repair context with only
the finding, repair delta, directly affected criteria, and affected checks. It
is never a second review assignment.

Host context preservation, compaction, retries, and restoration are runtime
concerns. After a discontinuity, recovery re-reads run state and repository and
evidence reality before resuming.
