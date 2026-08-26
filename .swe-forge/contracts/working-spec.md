# Ephemeral Working Spec Contract

Use this contract for the short-lived specification that guides a ticket,
especially in `PR` delivery mode. It is a session artifact, not a new source
of truth.

## Purpose

A working spec turns a broad ticket into a small, observable agreement before
implementation. It borrows the useful parts of proposal, requirements,
acceptance scenarios, and implementation notes without creating a repository
change folder or permanent project documentation.

The original ticket remains authoritative. The working spec may clarify,
organize, or make assumptions explicit, but it must not silently change the
ticket's intent or scope.

## Storage and Lifetime

- Keep the spec in active context for a short run when that is enough.
- When state must survive a context change or delegation, store it outside the
  repository under the run's restricted temporary directory and reference it
  from run state.
- Never write a ticket-specific working spec to the repository, commit it, or
  add an ignore rule just to hide it.
- Delete external working-spec files during cleanup and report a cleanup failure.
- A working spec may record the task DAG and commit dependencies, but it does
  not store worker-to-worker messages or dependency digests. The root derives
  each transient digest from an accepted structured result when rendering the
  dependent worker's briefing.

## Template

```yaml
spec_version: 1
status: draft | ready | revised
source_ticket: <immutable ticket text or external reference>

intent: >
  The user-visible problem or outcome.

scope:
  in:
    - <observable capability or affected area>
  out:
    - <explicit non-goal>

requirements:
  - id: R1
    statement: <system behavior in observable terms>
    scenarios:
      - given: <context>
        when: <trigger>
        then:
          - <observable result>

acceptance:
  - <checkable condition>

discovery_strategy:
  mode: ROOT_ONLY | DELEGATED_RESEARCH
  rationale: <why discovery questions can or cannot leave root context>
  questions: []
  batch:
    strategy: FAN_OUT_FAN_IN | ROOT_ONLY | SEQUENTIAL
    # Host runtime chooses whether ready items run concurrently or sequentially.
    fan_in: ONE_BARRIER | NONE
  capability: available | unavailable | unknown
  final_routing_deferred: true

review_focus:
  goal: <one-sentence review objective>
  acceptance_criteria_checked:
    - <criterion ID or statement the reviewer must check>
  in_scope:
    - <changed behavior, relevant repository practice, or concrete risk>
  non_goals:
    - <unrelated cleanup, refactor, or future work>
  finding_rule: >
    Raise a finding only when it affects an acceptance criterion, explicit
    constraint, or concrete relevant risk in the changed behavior; record useful
    out-of-scope observations as deferred follow-ups.

commit_plan:
  - id: S1
    objective: <one cohesive observable step>
    scope: [<owned path or symbol>]
    depends_on: []
    validation: [<targeted check>]
    commit_subject: <imperative subject>

In `PR`, `commit_plan` is required before the spec can be `ready`: it must
contain at least one ordered step, and every step must have a unique identity,
cohesive objective, owned scope, dependencies, targeted validation, and commit
subject. The plan is the semantic authority; run state may retain only the
minimal step identity/status/checkpoint/commit projection needed for executable
delivery checks.


routing:
  requested_mode: AUTO | SOLO | SUBAGENTS
  preferred: SOLO | SUBAGENTS
  current: SOLO | SUBAGENTS
  reason: <why this topology is the smallest safe choice>
  fallback_used: no | <preferred -> effective selection and reason>



constraints:
  - <compatibility, safety, or repository constraint>

specialist_skills:
  - id: <identifier>
    source: <user-provided or already-installed path or URL>
    status: selected | skipped | unavailable
    reason: <ticket fit and expected benefit, or why it was not used>

testing:
  behavior: <observable behavior being changed, or none>
  seam: <public interface or observable boundary, or none>
  existing_coverage: <relevant tests or none found>
  approach: regression | acceptance | characterization | existing-sufficient | manual | not-applicable
  development_mode: test-first | test-after | not-applicable
  rationale: <why this is the smallest useful evidence>

assumptions:
  - <low-risk assumption, or none>

architecture:
  approach: <smallest compatible approach>
  affected_areas:
    - <path, symbol, or interface>
  risks:
    - <risk and mitigation>

validation:
  - command: <command or manual check>
    requirement: required | conditional | informational
    condition: <when it applies>
    side_effects: local-only | external-read | external-write | destructive

delivery:
  mode: GUIDED | PR
  checkpoint_plan:
    - <review slice, or none for PR mode>
  authorized_actions:
    - <action and explicit provenance, or none>

open_questions: []
```

## Readiness Rules

A `ready` working spec has a concrete intent, bounded scope and non-goals,
observable requirements, acceptance checks, a testing decision, a validation
plan, and explicit assumptions. It records a lightweight discovery assessment;
`DELEGATED_RESEARCH` requires bounded read-only questions and structured
evidence, while coupled or unclear work remains `ROOT_ONLY`. In `PR`, it also
has a review focus with a clear goal, the acceptance criteria to check, relevant
in-scope quality concerns, non-goals, and a finding rule that keeps unrelated
work out of the current review. It records the preferred and current topology,
concise routing reason, and fallback evidence; native capability is freshly
observed at the delegation boundary rather than cached as a routing profile.
For `PR`, readiness also requires a valid non-empty ordered `commit_plan`;
implementation must not begin while the plan is absent, ambiguous, or missing
per-step validation and commit subjects.

For a long-running ticket, the durable run state records the next valid
workflow action. Host context preservation, compaction, retry, and restoration
remain outside the working spec; after a context discontinuity, recovery
re-reads authoritative state and repository/evidence reality before resuming.
Open questions may remain only when they do not block safe implementation and
are recorded as risks. Ask the user about a blocking decision rather than
guessing.
