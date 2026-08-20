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

- Keep the spec in active context for a short `SOLO` run when that is enough.
- When state must survive a context change or delegation, store it outside the
  repository under the run's restricted temporary directory and reference it
  from run state.
- Never write a ticket-specific working spec to the repository, commit it, or
  add an ignore rule just to hide it.
- Delete external working-spec files during cleanup and report a cleanup
  failure.
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
  questions:
    - id: <short identifier>
      objective: <bounded read-only question>
      allowed_scope: [<paths or symbols>]
      evidence_budget: <concise result limit>
      acceptance: <what makes the evidence useful>
  batch:
    strategy: FAN_OUT_FAN_IN | ROOT_ONLY | SEQUENTIAL
    max_workers: <existing conservative worker limit>
    fan_in: ONE_BARRIER | NONE
  backend: NONE | NATIVE | HERDR
  write_isolation: SHARED
  final_routing_deferred: true

review_focus:
  goal: <one-sentence review objective>
  acceptance_criteria:
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
    # Completed dependency facts are rendered transiently in the worker
    # briefing; do not persist a dependency digest in the working spec.
    validation: [<targeted check>]
    commit_subject: <imperative subject>

routing:
  requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
  preferred_mode: SOLO | SUBAGENTS | ISOLATED
  selected_mode: SOLO | SUBAGENTS | ISOLATED
  execution_mode: SOLO | SUBAGENTS | ISOLATED
  requested_provider: AUTO | NATIVE | HERDR | NONE
  execution_provider: NATIVE | HERDR | NONE
  delegation_backend: NONE | NATIVE | HERDR | OTHER
  write_isolation: SHARED | WORKTREE
  provider_reason: <why the provider satisfies isolated-execution requirements>
  parallel_strategy: NONE | COMPOSE
  integration_strategy: NONE | CHERRY_PICK
  provider_constraints:
    non_isolated: execution_provider=NONE, parallel_strategy=NONE, integration_strategy=NONE
    isolated: execution_provider=NATIVE|HERDR, parallel_strategy=COMPOSE, integration_strategy=CHERRY_PICK
  reason: <why this topology and provider are the smallest safe choice>
  fallback_used: no | <requested/preferred mode/provider -> selected mode/provider and reason>
  context_value:
    projected_pressure: low | medium | high | unknown
    context_reducibility: low | medium | high | unknown
    delegatable_context: low | medium | high | unknown
    root_context_requirement: low | medium | high | unknown
    continuity_risk: low | medium | high | unknown
    rationale: <why generated information can or cannot leave the root>
  revisions:
    - from: SOLO | SUBAGENTS | ISOLATED
      to: SOLO | SUBAGENTS | ISOLATED
      reason: <evidence>
      phase: <workflow phase>
      boundary: <safe boundary>
  runtime_profile_ref: <capability profile or none>

context_strategy:
  status: healthy | near-limit | overflow | compacting | recovered | unknown | blocked
  capability_status: proven | partial | unknown | unavailable
  signal_source: <adapter, host event, telemetry, or none>
  usage_tokens: <number or unknown>
  context_window: <number or unknown>
  state_reinjection: available | unavailable | unknown
  safe_boundary: true | false
  expected_next_context_tokens: <number or unknown>
  last_compaction: <event, session entry, timestamp, or none>
  near_limit_action: <checkpoint and native/adapter compaction, or manual fallback>
  overflow_action: <host recovery and recheck, or blocked/manual resume>
  durable_state_ref: <external working spec and run-state reference>

isolated_plan:
  delivery_checkout:
    path: <absolute orchestrator integration worktree or none>
    branch: <one integration/delivery branch or none>
    base_sha: <exact base or none>
  integration_branch: <reference delivery_checkout.branch; do not duplicate identity>
  integration_worktree: <reference delivery_checkout.path; do not duplicate identity>
  foundation: []
  tasks: []
  current_wave: <wave or none>
  integration_order: []
  shared_artifacts: []
  environment_isolation:
    setup_commands: []
    copied_ignored_files: []
    ports: []
    databases: []
    docker_projects: []
    temporary_directories: []
    external_resources: []
    cleanup_commands: []

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
plan, and explicit assumptions. It records a lightweight `discovery_strategy`
assessment; `DELEGATED_RESEARCH` requires bounded read-only questions and
structured evidence, while coupled or unclear work remains `ROOT_ONLY`. When
multiple independent questions are delegated, the assessment records one
bounded `FAN_OUT_FAN_IN` batch and one root fan-in barrier; a dependent sequence
is `SEQUENTIAL` and never parallelized. In `PR`, it also has a `review_focus`
with a clear goal, the acceptance criteria to check, relevant in-scope quality
concerns, non-goals, and a finding rule that
keeps unrelated work out of the current review. It records preferred versus
selected topology, the delegation backend, and provider separately. For a
long-running or context-risk ticket, it also
records a context strategy, latest status, capability source,
state-reinjection status, safe compaction boundary/action, expected next-action
headroom, overflow action, and durable-state reference. The provider state is
conditional: non-isolated execution uses `NONE` for provider and strategies,
while `ISOLATED` uses `NATIVE` or `HERDR`, `COMPOSE`, and `CHERRY_PICK`. A
read-only `SUBAGENTS` run may use `delegation_backend: HERDR` without selecting
`ISOLATED`. An isolated plan must identify its one integration/delivery branch,
foundation, task DAG, wave, shared-artifact owners, environment resources, and
planned integration order. When a specialist skill is considered, its source,
status, and selection reason are also recorded. Open questions may remain only
when they do not block safe implementation and are recorded as risks. Ask the
user about a blocking decision rather than guessing.
