# Worker Briefing Projection

This is a small worker-facing **projection schema**, not a second task
contract. The canonical task contract and active run state remain the sole
source of truth. The orchestrator renders one briefing from those sources for
each bounded launch; a worker never edits the projection to change scope,
authorization, topology, or acceptance.

## Rendering boundary

- Render the briefing immediately before launch from the assigned task and the
  current run-state facts.
- Include only the fields below that the worker's role, write access, and
  execution mode require.
- Preserve references to repository files and symbols so the worker can inspect
  its allowed scope. Do not paste large file contents into the briefing.
- Pass the briefing with the canonical role and the applicable result or review
  contract. Do not pass the root transcript, unrelated ticket history, or the
  complete SWE Forge specification merely because the orchestrator loaded it.
- If a dependency is complete, derive its compact `dependency_digest` from the
  accepted structured result and the assigned task's needs before rendering the
  briefing; never forward the complete result.
- The briefing cannot add acceptance criteria, widen scope, grant an action,
  or replace the task contract; omitted fields remain root-owned state.

## Projection schema

```yaml
worker_briefing:
  schema: worker-brief/v1
  task_id: <assigned task identifier>
  worker:
    role: <canonical role name>
    mode: delegated_worker | root_orchestrator
    depth: <depth from root owner>
    recursive_delegation: false
  objective: <one bounded objective>
  acceptance:
    - <relevant checkable criterion copied from the task contract>
  repository:
    instructions:
      - <relevant AGENTS.md, CONTRIBUTING.md, or local instruction path>
    allowed_reads:
      - <repository-relative path, symbol, or command scope>
    allowed_writes:
      - <repository-relative path or none>
  architecture_decisions:
    - <only a decision that affects this task>
  dependencies:
    completed:
      - task_id: <accepted dependency task in status done>
        dependency_digest:
          accepted_decisions:
            - <accepted decision B needs>
          relevant_facts:
            - <discovered fact B needs>
          changed_interfaces:
            - <changed or public interface B must use>
          paths_symbols:
            - <path or symbol B must inspect>
          authoritative_assumptions:
            - <assumption that became authoritative for this run>
          validation_facts:
            - <validation fact relevant to B>
          unresolved_risks:
            - <unresolved blocker or risk that affects B>
          source_refs:
            - <accepted result or evidence reference for deeper inspection>
        # Omit empty digest categories; source_refs are references, not copied content.
    pending:
      - <dependency or none>
  validation:
    - command: <assigned check>
      requirement: required | conditional | informational
      condition: <observable condition>
      side_effects: local-only | external-read | external-write | destructive
  permissions:
    write_access: read-only | read-write
    topology: SOLO | SUBAGENTS | ISOLATED
    write_isolation: SHARED | WORKTREE
    allowed_actions:
      - <read, edit, validation, or other explicitly assigned action>
    forbidden_actions:
      - <delivery, recursion, or other prohibited action>
  return:
    profile: <READ_ONLY | WRITABLE | ISOLATED_WRITABLE | REVIEW, derived from result.md>
    contract: <canonical result.md or review.md path>
    expected_output:
      - <structured fields the orchestrator will consume>

  # Include this section only for an ISOLATED read-write worker. It is not
  # present for read-only or non-isolated workers.
  isolated_execution:
    provider: NATIVE | HERDR
    delegation_backend: NATIVE | HERDR
    checkout:
      path: <absolute worker worktree>
      branch: <local-only worker branch>
      worktree_role: worker
      worktree_kind: worker
      integration_path: <absolute central integration worktree>
      integration_branch: <central integration/delivery branch>
    git:
      base_sha: <exact integration SHA used to create this worker>
      integration_checkpoint_sha: <central checkpoint SHA>
      wave: <planned dependency wave>
      integration_order: <planned integer>
    ownership:
      allowed_scope: [<paths or symbols>]
      forbidden_scope: [<paths or symbols>]
      shared_artifacts:
        - artifact: <path or generated resource>
          owner: <one task or orchestrator>
    environment_isolation:
      setup_commands: []
      copied_ignored_files: []
      ports: []
      databases: []
      docker_projects: []
      temporary_directories: []
      external_resources: []
      cleanup_commands: []
    authorization:
      create_branch: not-authorized
      create_worktree: not-authorized
      worker_setup: not-authorized | PR | continue
      worker_transfer_commit: not-authorized | PR | continue
      commit: not-authorized
      push: not-authorized
      create_pull_request: not-authorized
      publish: not-authorized
      deploy: not-authorized
      merge: not-authorized
    transfer:
      local_only: true
      integration_strategy: CHERRY_PICK
      result_bundle: <canonical result-bundle.md path>
      required_deliverable_commits: true
      source_commits: <local worker transfer commits>
      source_to_integration_mapping: required
```

## Dependency digest rules

`dependencies.completed` contains one digest per completed dependency that is
relevant to the assigned task. The root orchestrator renders it only after the
dependency's structured result is accepted and only selects entries that B
needs for its objective or acceptance criteria. A digest is transient launch
context; it is not persisted as a task-to-task message, and its source result
remains root-owned.

The digest must omit reasoning transcripts, exploration history, unrelated
findings, full test logs, full diffs when paths or commits are enough, and
delivery metadata unrelated to B. It must not grant B new scope, permissions,
authority, or a way to contact A. B must request a contract revision before
expanding scope even when the digest points to additional material.

## Inclusion rules

| Worker | Include | Omit |
| --- | --- | --- |
| Read-only | role, objective, relevant acceptance, repository instructions, allowed reads, relevant architecture/dependencies, assigned validation, read-only permissions, return shape | writable scope/actions, delivery authorization, provider state, worktree/base/transfer state, unrelated run continuation |
| Non-isolated read-write | the common fields plus allowed writes, assigned write/validation permissions, and any current checkout fact needed to edit safely | isolated provider, worktree, integration-order, environment-isolation, and transfer fields |
| Isolated read-write | the common fields plus the complete `isolated_execution` section | unrelated root state and transcript |

`isolated_execution` is an all-or-nothing safety section. Do not shorten it
when the worker is writable: exact Git identity and base, ownership, runtime
resource isolation, per-action authorization, local-only transfer, and result
requirements must travel together. If a required value is unavailable, do not
invent it; block or serialize the task through the normal workflow.

The `return.profile` value is a pointer to the selected canonical contract,
not a new result schema. `READ_ONLY` and `WRITABLE` use `result.md`,
`ISOLATED_WRITABLE` uses the complete `result-bundle.md`, and `REVIEW` uses
`review.md`. A worker may discover implementation details with its allowed
repository tools. The root supplies pointers and decisions, not an exploration
transcript.
