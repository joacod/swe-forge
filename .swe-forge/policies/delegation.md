# Delegation Policy

## Coordination Topology

Use hub-and-spoke coordination:

```text
orchestrator -> bounded workers -> structured results -> orchestrator
```

Workers do not maintain unrestricted peer conversations or treat each other as
the source of truth. The orchestrator owns the task graph, dependencies,
shared state, delivery checkout, and acceptance.

## When to Delegate

Delegate only when the worker has a distinct objective and the result can be
evaluated independently. Useful delegation includes read-only discovery,
architecture analysis, test strategy, one bounded implementation task, and
fresh-context review.

Ask whether delegation materially reduces the information the root must retain:
a worker should return concise evidence while its exploratory transcript stays
in the worker context. A large prompt, file count, or difficult ticket is not
sufficient by itself. Keep work in `SOLO` when requirements interact globally,
the root needs the whole investigation, or coordination costs exceed context
relief.

Do not delegate a trivial change, a tightly coupled algorithm, or a task whose
communication cost exceeds its likely benefit. Native subagents are an
optional capability; their presence never chooses the topology.

### Early discovery research

`DELEGATED_RESEARCH` is a narrow read-only use of this policy. It is appropriate
only for independently evaluable questions such as inspecting a subsystem,
call-site family, persistence flow, migration behavior, or test convention. The
task package contains one question, bounded allowed reads, a concise evidence
budget, and an observable acceptance condition. The worker returns evidence and
risks, not a topology, delivery, or implementation decision.

If the native capability is unavailable, use `ROOT_ONLY` discovery or sequential
research without claiming delegation.

### Discovery fan-out/fan-in

When at least two discovery questions are independently answerable and
context-reducible, form one bounded batch from the ready questions. Launch each
worker in the same read-only wave before consuming any result. Each receives
exactly one question, its own allowed read scope, a concise evidence budget,
and the `READ_ONLY` result contract. Workers do not communicate, write, recurse,
or make routing or delivery decisions.

The orchestrator waits at one fan-in barrier, validates and consumes all
structured results together, resolves contradictions from repository evidence,
and then continues the root workflow. Coupled questions remain root-only, or
follow a real dependency sequentially when separate delegation is useful. If
the native capability cannot launch the batch safely, fall back without
claiming parallel execution.

## Delegation fan-out and runtime scheduling

Keep semantic fan-out small, bounded, independently evaluable, and justified
by coordination relief. The orchestrator decides which tasks exist and which
dependency waves are ready; it does not prescribe an exact number of active
workers, queue slots, or simultaneous executions. The host runtime may schedule
ready tasks concurrently or sequentially.

Use one worker for a single bounded implementation task, keep the reviewer
independent when review is required, invoke security and performance
specialists only for relevant surfaces, and do not let workers recursively
spawn workers unless a task authorizes it.

## Task Creation

Before delegation, create a task contract using `../contracts/task.md`. The
contract must specify:

- one objective and accountable owner;
- reason for separation and dependencies;
- allowed and forbidden scope;
- observable acceptance criteria;
- assigned validation;
- canonical delivery-candidate baseline and expected result;
- per-action authorization with user-message provenance; and
- recursive delegation disabled by default or explicitly bounded.

Workers must request a contract update before expanding scope. Every writing
task owns a non-overlapping path or symbol set. Its writable result is
materialized into the canonical delivery candidate, validated there, and
accepted sequentially.

## Dependency Waves

Execute tasks only after dependencies are satisfied:

1. read-only discovery and research;
2. specification and architecture;
3. test strategy or regression setup when useful;
4. bounded implementation tasks; materialize and accept writable results
   sequentially against the canonical delivery candidate;
5. verification;
6. fresh review and bounded repair.

Waves may collapse for a small ticket. Do not create an artificial wave just to
make the workflow look more complex.

## Ownership

- one writing task owns a path or symbol set at a time;
- read-only workers may inspect shared files;
- concurrent mutation of the canonical delivery candidate is forbidden;
- the root orchestrator owns the delivery checkout and final delivery;
- the orchestrator preserves unrelated user changes; and
- no worker may rewrite another active task's scope without authorization.

## Worker Runtime

Worker execution uses the effective runtime chosen by the active harness or
orchestration environment. SWE Forge does not require a worker process to run
in the canonical delivery checkout. If the host uses a private worktree,
sandbox, overlay, container, or equivalent mechanism, the bounded result must
be materialized into the canonical delivery candidate and validated there
before the root accepts it or supplies it to dependent work.

## Worker Briefing Projection

The complete task contract and active run state belong to the orchestrator. At
the launch boundary, write transient `worker-brief-input/v1` records and invoke
`../tools/swe-forge-worker-brief`. That tool is the sole mechanical owner of
the `worker_briefing/v1` projection, structural validation, profile/contract
selection, and inclusion/omission rules. Do not create a second task contract
or ask a worker to reconstruct root state from a transcript.

The root selects the semantic objective, acceptance, scope, architecture
context, validation, and relevant dependency facts. The tool copies those
choices and derives only mechanical permissions, recursion, result, and
capability facts. Pass its validated output unchanged with the canonical role
and result/review contract.

### Dependency handoff projection

The task graph and accepted results remain root-owned. When task B depends on
completed task A, the orchestrator waits for A to be `done`, validates A's
structured result against its task and result contracts, and selects a small
B-relevant `dependency_digest`. The digest is transient launch context, not a
worker-to-worker message or a second source of truth. The renderer rejects an
undeclared, incomplete, or unaccepted dependency but does not decide relevance.

A digest may contain only accepted B-relevant decisions, facts, changed
interfaces, paths or symbols, authoritative assumptions, validation facts,
unresolved risks, and source references. Omit transcripts, exploration history,
unrelated findings, full logs or diffs, and unrelated delivery metadata. A
digest never changes B's scope, permissions, dependencies, or authority.

Workers discover repository content through allowed paths and symbols. They do
not create PRs, push, merge, publish, deploy, reroute the ticket, redo root
discovery, or spawn descendants by default.

## Result Profiles and Handling

`../contracts/result.md` owns ordinary result-profile selection and field
shapes. The canonical worker-brief renderer applies the profile map:

- read-only research or analysis uses `READ_ONLY`;
- bounded writing whose result is materialized into the canonical delivery
  candidate uses `WRITABLE`; and
- independent review uses `../contracts/review.md`, not an implementation result
  profile.

The worker briefing may carry the selected profile reference, but it must not
redefine the profile or turn omitted fields into required empty sections. For
ordinary results, the accountable consumer may use
`.swe-forge/tools/swe-forge-worker-result validate` independently of the host
mechanism.

Consume every worker result using the selected canonical contract. For
`READ_ONLY`, check status/task identity, concise findings, precise evidence, and
only relevant risks or recommended action. For `WRITABLE`, additionally check
canonical delivery identity/fingerprint, scope, Git/change evidence, assigned
validation, and blockers. For `REVIEW`, apply the review contract's acceptance
check and blocking matrix.

Incomplete, ambiguous, or profile-mismatched results are `BLOCKED` until
clarified, not silently normalized with empty Git or delivery sections.
