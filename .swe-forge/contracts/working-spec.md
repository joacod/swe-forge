# Ephemeral Working Spec Contract

A working spec is a short PR planning artifact. The ticket remains
authoritative; the spec makes intent, boundaries, evidence, and review scope
executable without creating project documentation.

## Storage

Keep it in active context or the run's restricted temporary directory. Never
commit it, put it in the repository, or add an ignore rule. Delete external
copies during cleanup. Run state owns continuation; dependency digests are
created at launch and do not belong here.

## Minimum shape

Omit ceremonial sections. A ready spec normally contains:

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
  testing: <testing decision, or not-applicable>
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

Omit empty `scope.out`, `risks`, and review lists. Acceptance stays observable.
For behavior changes, expand `testing` with behavior, seam, existing coverage,
approach, and rationale. Add `assumptions`, `open_questions`, discovery shape,
or routing facts only when they affect safe implementation or explain the
selected topology. Delivery authorization and continuation belong to run state
and delivery policy.

## Readiness

A `ready` spec has a concrete goal, bounded scope, observable acceptance,
smallest approach, meaningful risks when present, testing decision, selected
validation, and initial review focus covering every ticket criterion and
constraint. Skip an interview when the ticket supplies these facts. Ask only
blocking intent, compatibility, risk, or external-action questions; record
low-risk assumptions.

`review_focus` is the sole structured review scope and may reference acceptance
IDs. After one concrete, localized, clearly repairable finding, create a separate
transient repair context containing only the finding, repair delta, affected
criteria, and checks. It is not a second review assignment.

Host context preservation, compaction, retries, and restoration are runtime
concerns. After discontinuity, recovery re-reads state, repository, and evidence
before resuming.
