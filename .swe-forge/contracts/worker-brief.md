# Worker Briefing Projection

This is the worker-facing projection, not a second task contract. The root
owns the task contract and run state; the canonical renderer owns projection
shape and mechanical permissions.

## Renderer

Use immediately before launch:

```text
.swe-forge/tools/swe-forge-worker-brief render --input FILE|- [--output FILE]
.swe-forge/tools/swe-forge-worker-brief validate --brief FILE|- [--input FILE|-]
.swe-forge/tools/swe-forge-worker-brief inspect --brief FILE|-
```

The transient `worker-brief-input/v1` records supply root-selected task,
routing, validation, and dependency facts. The tool derives
`worker_briefing/v1`, profile, permissions, recursion defaults, contract, and
inclusion/omission rules. Validate the output and pass it unchanged with the
canonical role and result/review contract. Do not pass full state, transcripts,
exploration history, or pasted repository files.

`REVIEW` is read-only and receives supplied evidence; it does not grant tests,
formatters, linters, builds, or validation actions. The renderer does not decide
scope, acceptance, dependency relevance, routing, or delivery.

## Projection shape

```yaml
worker_briefing:
  schema: worker-brief/v1
  task_id: <assigned task>
  worker:
    role: <canonical role>
    mode: delegated_worker
    depth: <depth from root>
    recursive_delegation: false
  objective: <one bounded objective>
  acceptance: [<relevant checkable criteria>]
  repository:
    instructions: [<relevant instruction paths>]
    allowed_reads: [<paths, symbols, or command scope>]
    allowed_writes: [<paths or none>]
  architecture_decisions: [<task-relevant decisions>]
  dependencies:
    completed:
      - task_id: <accepted dependency>
        dependency_digest:
          accepted_decisions: []
          relevant_facts: []
          changed_interfaces: []
          paths_symbols: []
          authoritative_assumptions: []
          validation_facts: []
          unresolved_risks: []
          source_refs: []
    pending: [<dependency or none>]
  validation:
    - command: <assigned check>
      requirement: required | conditional | informational
      condition: <observable condition>
      side_effects: local-only | external-read | external-write | destructive
  permissions:
    write_access: read-only | read-write
    topology: SUBAGENTS
    allowed_actions: [<derived actions>]
    forbidden_actions: [<derived prohibitions>]
  return:
    profile: READ_ONLY | WRITABLE | REVIEW
    contract: <canonical result or review contract>
    expected_output: [<fields the root consumes>]
```

## Root-selected content and dependency digests

The root supplies objective, acceptance, scope, repository pointers, relevant
architecture, validation, result fields, and the decision to delegate. The
renderer copies or checks these values; it cannot grant authority.

A completed dependency must be `done` with an accepted result before the root
adds its digest. The digest is transient launch context, not a peer message or
persistent handoff. Include only accepted facts B needs: decisions, interfaces,
paths/symbols, assumptions, validation facts, risks, and source references.
Omit reasoning, exploration, unrelated findings, full logs/diffs, and delivery
metadata. It cannot expand scope, permissions, authority, or dependencies.

| Worker | Include | Omit |
| --- | --- | --- |
| Read-only | common fields, read-only permissions, selected contract | writes, checkout/delivery state |
| Review | initial review focus, ticket context, read-only permissions, evidence | edits, validation actions, unrelated criteria, transcript |
| Read-write | common fields, allowed writes, candidate permissions, writable contract | delivery actions, physical host details, unrelated state |

Workers discover details through allowed paths and request a contract revision
before expanding scope. They do not create PRs, push, merge, publish, deploy,
reroute, redo root discovery, or spawn descendants by default. A repair worker
receives a focused writable task, not a second review assignment.
