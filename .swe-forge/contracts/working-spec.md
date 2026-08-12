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

constraints:
  - <compatibility, safety, or repository constraint>

specialist_skills:
  - id: <identifier>
    source: <user-provided or already-installed path or URL>
    status: selected | skipped | unavailable
    reason: <ticket fit and expected benefit, or why it was not used>

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
observable requirements, acceptance checks, a validation plan, and explicit
assumptions. When a specialist skill is considered, its source, status, and
selection reason are also recorded. Open questions may remain only when they do
not block safe implementation and are recorded as risks. Ask the user about a
blocking decision rather than guessing.
