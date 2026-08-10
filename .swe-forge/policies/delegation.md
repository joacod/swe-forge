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

Do not delegate a trivial change, a tightly coupled algorithm, or a task whose
communication cost exceeds its likely benefit.

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
Writable tasks must classify validation requirements and side effects. Workers
may not substitute required checks or infer one authorized action from another.
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
- concurrent writers require separate worktrees
- Herdr worktrees are integrated centrally, one at a time
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
