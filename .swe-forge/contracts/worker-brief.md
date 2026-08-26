# Worker Briefing Projection

This is a small worker-facing **projection schema**, not a second task
contract. The task contract and active run state remain the source of truth. The
root agent chooses the semantic task; the canonical renderer owns its
mechanical launch projection.

## Executable owner

Use the portable tool at `.swe-forge/tools/swe-forge-worker-brief` immediately
before launch:

```text
swe-forge-worker-brief render --input FILE|- [--output FILE]
swe-forge-worker-brief validate --brief FILE|- [--input FILE|-]
```

Host adapters that need to realize a validated projection may use the
machine-readable inspection port:

```text
swe-forge-worker-brief inspect --brief FILE|-
```

It returns deterministic JSON containing the canonical `task_id`, `profile`,
and `write_access`. The adapter maps those semantic facts to native profiles
and permissions; it does not parse the YAML projection.

The transient `worker-brief-input/v1` record set supplies the semantic task,
current routing facts, and the root-selected dependency digest. The tool emits
the canonical YAML `worker_briefing` projection. `validate --brief` checks a
received projection structurally; adding `--input` re-renders the input and
rejects any non-deterministic, scope-expanding, or permission-changing
projection. The tool's `--help` owns the record grammar; adapters do not
recreate it.

The renderer mechanically owns schema/version, projection shape, mode and
recursion defaults, permissions, result-profile and contract selection, and
dependency-result eligibility. Profile selection is deterministic: reviewer
plus read-only is `REVIEW`, other read-only is `READ_ONLY`, and read-write is
`WRITABLE`. A `REVIEW` projection is read-only for supplied evidence: it does
not grant a validation action, so the reviewer cannot run tests, formatters,
linters, builds, or project-wide checks. It does not decide whether an
objective is good, whether acceptance is sufficient, whether a dependency fact
is relevant, or whether delegation is appropriate.

Pass the validated output unchanged with the canonical role and applicable
result or review contract. After a worker returns, the accountable consumer
may invoke `.swe-forge/tools/swe-forge-worker-result validate` with the selected
profile, role, and task identity. That validation is independent of the host
mechanism that produced the result. Do not pass the root transcript, unrelated
ticket history, complete run state, or large pasted repository files.

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
    topology: SUBAGENTS
    allowed_actions:
      - <mechanically derived read/edit/validation action>
    forbidden_actions:
      - <mechanically derived delivery, recursion, or scope prohibition>
  return:
    profile: READ_ONLY | WRITABLE | REVIEW
    contract: <canonical result.md or review.md path>
    expected_output:
      - <structured fields the orchestrator will consume>
```

## Root-selected semantic content

The root remains responsible for the objective, task decomposition, canonical
role, depth and ownership, relevant acceptance criteria, repository
instructions, allowed reads and writes, architecture decisions, validation
entries, expected result fields, dependency relevance, and the decision to
delegate. These are copied or checked, not inferred from a prompt. The renderer
does not replace task or run state and cannot grant scope or authority.

## Dependency digest rules

`dependencies.completed` contains one digest per completed dependency that is
relevant to the assigned task. The root renders it only after the dependency's
structured result is accepted and selects entries that the next worker needs for
its objective or acceptance criteria. The digest is transient launch context;
it is not persisted as a task-to-task message.

The digest may contain only concise, accepted B-relevant entries: accepted
decisions, relevant facts, changed interfaces, paths or symbols,
authoritative assumptions, validation facts, unresolved risks, and source
references. It must omit reasoning transcripts, exploration history, unrelated
findings, full logs, full diffs, and unrelated delivery metadata. It cannot grant
new scope, permissions, authority, or a peer communication channel.

The renderer rejects a digest for an undeclared, incomplete, or unaccepted
dependency. It does not decide which accepted facts are relevant.

## Inclusion rules

The renderer owns this inclusion matrix. Other workflow, policy, adapter, and
contract files point here rather than repeating it.

| Worker | Include | Omit |
| --- | --- | --- |
| Read-only | common semantic fields, read-only permissions, selected result/review contract | writable scope/actions, checkout and delivery state |
| Review | the supplied review focus, only necessary ticket context, prior findings or repair delta when focused, read-only permissions, review contract, and validation evidence to inspect | edit or validation actions, unrelated ticket criteria, workflow state, and transcript |
| Read-write | common fields, allowed writes, canonical delivery-candidate permissions, writable result contract | delivery actions, physical host execution details, unrelated run state, transcript |

Workers discover implementation details through their allowed paths and
symbols. Reviewers receive the complete ticket-relevant focus for the initial
review and only the prior blockers, repair delta, and directly affected focus
for a focused re-review; unaffected PASS conclusions carry forward. They must
request a contract revision before expanding scope and must not create PRs,
push, merge, publish, deploy, reroute, redo root discovery, run validation, or
spawn descendants by default.
