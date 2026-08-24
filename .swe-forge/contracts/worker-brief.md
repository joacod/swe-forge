# Worker Briefing Projection

This is a small worker-facing **projection schema**, not a second task
contract. The canonical task contract and active run state remain the source of
truth. The root agent chooses the semantic task; the canonical renderer owns
its mechanical launch projection.

## Executable owner

Use the portable tool at `.swe-forge/tools/swe-forge-worker-brief` immediately
before launch:

```text
swe-forge-worker-brief render --input FILE|- [--output FILE]
swe-forge-worker-brief validate --brief FILE|- [--input FILE|-]
```

The transient `worker-brief-input/v1` record set supplies the semantic task,
current canonical execution facts, current isolated-execution facts when
applicable, and the root-selected dependency digest. The tool emits the
canonical YAML `worker_briefing` projection. `validate --brief` checks a
received projection structurally; adding `--input` re-renders the input and
rejects any non-deterministic, scope-expanding, permission-changing, or
incompatible projection. The tool's `--help` owns the record grammar; do not
recreate it in an adapter or provider.

The renderer mechanically owns schema/version, projection shape, mode and
recursion defaults, permission/topology consequences, result-profile and
contract selection, conditional isolated safety data, and dependency-result
eligibility. Profile selection is deterministic: reviewer plus read-only is
`REVIEW`, other read-only is `READ_ONLY`, shared read-write is `WRITABLE`, and
isolated read-write is `ISOLATED_WRITABLE`. It does not decide whether an
objective is good, whether acceptance is sufficient, whether a dependency fact
is relevant, or whether delegation is appropriate.

Pass the validated output unchanged with the canonical role and applicable
result/review contract. Do not pass the root transcript, unrelated ticket
history, complete run state, or large pasted repository files.

## Projection schema

```yaml
worker_briefing:
  schema: worker-brief/v1
  task_id: <assigned task identifier>
  worker:
    role: <canonical role name selected for the task>
    mode: delegated_worker
    depth: <depth from root owner>
    recursive_delegation: false
  objective: <one bounded objective selected by the root>
  acceptance:
    - <relevant checkable criterion selected by the root>
  repository:
    instructions:
      - <relevant AGENTS.md, CONTRIBUTING.md, or local instruction path>
    allowed_reads:
      - <repository-relative path, symbol, or command scope selected by the root>
    allowed_writes:
      - <repository-relative path or none>
  architecture_decisions:
    - <only a root decision that affects this task>
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
      - <mechanically derived read/edit/validation action>
    forbidden_actions:
      - <mechanically derived delivery, recursion, or scope prohibition>
  return:
    profile: READ_ONLY | WRITABLE | ISOLATED_WRITABLE | REVIEW
    contract: <canonical result.md, result-bundle.md, or review.md path>
    expected_output:
      - <structured fields the orchestrator will consume>

  # Present only for an ISOLATED writable worker. The renderer treats this
  # safety section as all-or-nothing.
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

## Root-selected semantic content

The root remains responsible for the objective, task decomposition, canonical
role, depth and ownership, relevant acceptance criteria, repository
instructions, allowed reads and writes, architecture decisions, validation
entries, expected result fields, dependency relevance, and the decision to
delegate. These are copied or checked, not inferred from a prompt or a
provider. The renderer does not replace task or run state and cannot grant
scope or authority.

## Dependency digest rules

`dependencies.completed` contains one digest per completed dependency that is
relevant to the assigned task. The root renders it only after the dependency's
structured result is accepted and selects entries that the next worker needs
for its objective or acceptance criteria. The digest is transient launch
context; it is not persisted as a task-to-task message.

The digest may contain only concise, accepted B-relevant entries: accepted
decisions, relevant facts, changed interfaces, paths or symbols,
authoritative assumptions, validation facts, unresolved risks, and source
references. It must omit reasoning transcripts, exploration history, unrelated
findings, full logs, full diffs, and unrelated delivery metadata. It cannot
grant new scope, permissions, authority, or a peer communication channel.

The renderer rejects a digest for an undeclared, incomplete, or unaccepted
dependency. It does not decide which accepted facts are relevant.

## Inclusion rules

The renderer owns this inclusion matrix. Other workflow, policy, adapter, and
provider files point here rather than repeating it.

| Worker | Include | Omit |
| --- | --- | --- |
| Read-only | common semantic fields, read-only permissions, selected result/review contract | writable scope/actions, provider state, worktree/base/transfer state, isolated execution |
| Non-isolated read-write | common fields, allowed writes, shared-checkout permissions, writable result contract | isolated provider, worktree, integration-order, environment-isolation, and transfer fields |
| Isolated read-write | common fields, writable permissions, complete isolated safety section, result bundle contract | unrelated root state and transcript |

`isolated_execution` is all-or-nothing. Missing provider, exact Git/base,
ownership, resource-isolation, authorization, local-transfer, or result fields
blocks rendering rather than being guessed. Read-only and shared writable
briefs must not acquire provider or worktree fields merely because the root
knows them.

Workers discover implementation details through their allowed paths and
symbols. They must request a contract revision before expanding scope and must
not create PRs, push, merge, publish, deploy, reroute, redo root discovery, or
spawn descendants by default.
