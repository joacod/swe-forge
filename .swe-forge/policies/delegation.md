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

### Early discovery research

`DELEGATED_RESEARCH` is a narrow read-only use of the same policy. It is
appropriate only for independently evaluable questions such as inspecting an
isolated subsystem, call-site family, persistence flow, migration behavior, or
test convention. The task package must contain one question, bounded allowed
reads, a concise evidence budget, and an observable acceptance condition. The
worker returns evidence and risks, not a topology, delivery, or implementation
decision.

Early research keeps `write_isolation: SHARED`, never creates an `ISOLATED`
writer, passes only the relevant objective and repository references, and
cannot recurse. If no proven read-only backend exists, the orchestrator uses
`ROOT_ONLY` discovery; it does not emulate delegation with an untracked process
or claim that the strategy ran.

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

## Worker Runtime

Worker creation follows the default and explicit-override semantics in
`../policies/model-routing.md`. Unless the user or project intentionally
routes a worker differently, early research, standard subagents, review,
implementation, native, and Herdr-backed delegation keep the root provider,
model, and reasoning configuration. The delegation backend does not make an
automatic role-based optimization decision.

## Worker Briefing Projection

The complete task contract and active run state belong to the orchestrator. At
the launch boundary, derive one compact `worker_briefing` projection using
`../contracts/worker-brief.md`; do not create a second task contract or ask the
worker to reconstruct root state from a transcript. The projection is the only
work description sent to a bounded worker, together with the applicable
canonical role and result/review contract references.

The common projection contains only:

- the canonical role and `delegated_worker` mode/depth
- one objective and the relevant acceptance criteria
- relevant repository-instruction paths, allowed reads, and allowed writes
- only architecture decisions and dependency evidence needed for this task
- assigned validation with requirement, condition, and side-effect classification
- explicit permissions/isolation and forbidden actions
- the expected structured return shape

Render conditional state deliberately:

- read-only workers do not receive writable, delivery, provider, worktree,
  base-SHA, transfer, or unrelated continuation state
- non-isolated writable workers receive only the shared-checkout permissions
  and any current checkout fact needed to edit safely; omit isolated provider,
  worktree, integration-order, environment-isolation, and transfer fields
- isolated writable workers receive the complete `isolated_execution` section:
  provider/backend, exact worker and integration Git identities and base SHA,
  ownership and shared-artifact owners, environment isolation, per-action
  authorization, local-only transfer, integration order, and result-bundle
  requirements

Repository content is discovered through the listed allowed paths and symbols;
the root does not paste large files or exploration output. The worker does not
load the full SWE Forge specification or unrelated policies merely because the
root loaded them. It does not create PRs, push, merge, publish, deploy, make
delivery decisions, reroute the root ticket, redo root discovery, or spawn more
workers by default. Its output is a concise structured result with `status`,
`findings`, `evidence`, `risks`, and `recommended_action`.

The orchestrator validates the rendered projection against the task contract
before launch and consumes results through `../contracts/result.md` or the
review contract. A missing conditional safety field blocks or serializes the
worker; it is never guessed from provider lifecycle output.

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
