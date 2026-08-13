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

commit_plan:
  - id: S1
    objective: <one cohesive observable step>
    scope: [<owned path or symbol>]
    depends_on: []
    validation: [<targeted check>]
    commit_subject: <imperative subject>

routing:
  requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
  execution_mode: SOLO | SUBAGENTS | ISOLATED
  requested_provider: AUTO | NATIVE | HERDR | NONE
  execution_provider: NATIVE | HERDR | NONE
  provider_reason: <why the provider satisfies isolated-execution requirements>
  parallel_strategy: NONE | COMPOSE
  integration_strategy: NONE | CHERRY_PICK
  provider_constraints:
    non_isolated: execution_provider=NONE, parallel_strategy=NONE, integration_strategy=NONE
    isolated: execution_provider=NATIVE|HERDR, parallel_strategy=COMPOSE, integration_strategy=CHERRY_PICK
  reason: <why this topology and provider are the smallest safe choice>
  fallback_used: no | <requested mode/provider -> selected mode/provider and reason>

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
plan, and explicit assumptions. It records topology and provider separately. The provider state is
conditional: non-isolated execution uses `NONE` for provider and strategies,
while `ISOLATED` uses `NATIVE` or `HERDR`, `COMPOSE`, and `CHERRY_PICK`.
An isolated plan
must identify its one integration/delivery branch, foundation, task DAG, wave,
shared-artifact owners, environment resources, and planned integration order.
When a specialist skill is considered, its source, status, and selection reason
are also recorded. Open questions may remain only when they do not block safe
implementation and are recorded as risks. Ask the user about a blocking
decision rather than guessing.
