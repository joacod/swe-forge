# Delegation Policy

## Coordination Topology

Use hub-and-spoke coordination:

```text
orchestrator -> bounded workers -> structured results -> orchestrator
```

Workers do not maintain unrestricted peer conversations or treat each other as
the source of truth. The orchestrator owns the task graph, dependencies,
shared state, integration, and acceptance.

## When to Delegate

Delegate only when the worker has a distinct objective and the result can be
evaluated independently. Useful delegation includes read-only discovery,
architecture analysis, test strategy, bounded non-overlapping implementation,
and fresh-context review.

For context-aware routing, ask whether delegation materially reduces the
information the root must retain: a worker should return concise evidence,
while its exploratory transcript stays in the worker context. A large prompt,
large file count, or difficult ticket is not sufficient by itself. Keep work in
`SOLO` when requirements interact globally, the root needs the whole
investigation, or coordination costs exceed the context relief.

Do not delegate a trivial change, a tightly coupled algorithm, or a task whose
communication cost exceeds its likely benefit. The semantic topology is
separate from the realization mechanism: native workers and Herdr may be
backends for read-only `SUBAGENTS`; Herdr does not imply `ISOLATED`.

## Worker Limits

- default to two to four active workers
- use one worker for a single bounded implementation task
- keep the reviewer independent from the implementer when review is required
- invoke security and performance specialists only for relevant surfaces
- do not let workers recursively spawn workers unless a task authorizes it

The orchestrator may lower the limit for context, cost, or repository reasons.
Any higher limit needs a specific reason and a result-consumption plan.

## Task Creation

Before writable delegation, create a task contract using
`../contracts/task.md`. The contract must specify:

- one objective and accountable owner
- reason for separation
- dependencies and execution wave
- allowed and forbidden scope
- observable acceptance criteria
- assigned validation
- risk and write/isolation requirements
- checkout baseline and expected result
- per-action authorization with user-message provenance
- recursive delegation disabled by default or explicitly bounded

Workers must request a contract update before expanding scope.
Writable tasks must classify validation requirements and side effects. Isolated
worker tasks must also record an exact base SHA, wave, integration order,
shared-artifact owner, environment-isolation plan, and local-only delivery
permissions. Workers may not substitute required checks or infer one
authorized action from another.
Recursive delegation depth is measured from the original owner and worker limits
are total descendant budgets. Child contracts must carry the root task ID and
reduced remaining budgets; they cannot reset limits.

## Dependency Waves

Execute tasks only after dependencies are satisfied:

1. read-only discovery and research
2. specification and architecture
3. test strategy or regression setup when useful
4. independent writable implementation tasks
5. integration and conflict resolution
6. verification
7. fresh review and bounded repair

Waves may collapse for a small ticket. Do not create an artificial wave just
to make the workflow look more complex.

## Ownership and Isolation

- one writing task owns a path or symbol set at a time
- read-only workers may inspect shared files
- concurrent writers require separate worktrees and are classified as `ISOLATED`
- native or Herdr provider worktrees are integrated centrally, one at a time
- one integration/delivery branch remains the only ticket delivery boundary
- the orchestrator must preserve unrelated user changes
- no worker may rewrite another worker's checkout without authorization

## Worker Briefing

Pass the smallest context needed to perform the task:

- original objective and acceptance criteria
- relevant architecture decisions
- task contract and allowed scope
- dependencies already completed
- validation commands
- expected result format

For a bounded `delegated_worker` mode, package only:

```yaml
worker_mode:
  role: delegated_worker
  depth: 1
  recursive_delegation: false
  objective: <one objective>
  relevant_context: [<short references>]
  allowed_reads: [<paths or symbols>]
  allowed_writes: [<paths or none>]
  acceptance: [<checkable criteria>]
  expected_evidence: [<file/symbol/command/behavior evidence>]
  return_contract: ../contracts/result.md
```

Workers in this mode do not create PRs, push, merge, publish, deploy, make
delivery decisions, reroute the root ticket, redo root discovery, or spawn
more workers by default. Their output is a concise structured result with
`status`, `findings`, `evidence`, `risks`, and `recommended_action`.

Do not pass the entire orchestrator transcript by default. Workers should
return evidence, not a replay of their reasoning.

## Result Handling

Consume every worker result using `../contracts/result.md` or the equivalent
structured fields. Check:

- status is valid
- task ID matches
- touched files stay within scope
- acceptance criteria are addressed
- assigned validation actually ran
- failures, assumptions, and risks are visible

Incomplete or ambiguous results are `BLOCKED` until clarified, not silently
treated as successful.
