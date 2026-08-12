# Execution Routing Policy

## Objective

Select the smallest execution topology that provides a meaningful reliability
benefit for the ticket. More agents are not evidence of better engineering.
Execution topology and execution provider are separate decisions.

Automatic routing is the default for `/swe-forge <ticket>`. Explicit command
forms may request `solo`, `subagents`, or `isolated`; no separate routing worker
is required because the orchestrator already owns discovery and topology
choice.

Every run records topology, provider, and delivery independently:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why the provider satisfies the isolated-execution requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <specific evidence for the topology choice>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>
```

For non-isolated execution, record `execution_provider: NONE`,
`parallel_strategy: NONE`, and `integration_strategy: NONE`. Provider selection
is required only after `execution_mode: ISOLATED`.

## Decision Factors

Evaluate these factors before creating workers:

- change size and number of affected components
- coupling between implementation and tests
- amount of independent research or review required
- write-scope overlap and conflict risk
- need for separate services, processes, worktrees, or harnesses
- availability and quality of native subagent support
- verification burden and failure impact
- delivery mode and whether human checkpoints or uninterrupted execution are
  useful
- communication, context, and integration overhead

Task difficulty, file count, or the presence of Herdr alone is never a routing
criterion.

## Modes

### SOLO

Choose `SOLO` when any of these apply:

- the change is small and localized
- implementation and tests are tightly coupled
- the work is inherently sequential
- parallel workers would touch the same files, symbols, contracts, or
  generated artifacts
- a single context can inspect and verify the change efficiently
- a native worker or provider is unavailable and safe isolation is not required
- delegation or central integration overhead exceeds the expected benefit

`SOLO` still includes lightweight discovery, acceptance criteria, validation,
final diff review, and a concise report.

### SUBAGENTS

Choose `SUBAGENTS` when native workers can provide useful independent work,
such as:

- parallel read-only repository exploration
- external research requested by the ticket
- architecture or test-strategy analysis
- bounded writable delegation that runs sequentially in one checkout
- independent review in a fresh context

`SUBAGENTS` supports parallel read-only work and sequential bounded writable
delegation in one checkout. It does not authorize concurrent writable
worktrees. If concurrent writable workers use separate dedicated worktrees,
the selected topology is `ISOLATED`, even when the current harness supplies
those worktrees natively.

Strong context isolation by itself does not justify `ISOLATED`; native
read-only subagents are usually sufficient. Use fewer workers when the task
has limited independence. Do not simulate unavailable native workers with
unnecessary operating-system processes.

### ISOLATED

Choose `ISOLATED` only when concurrent writable work requires separate
execution environments and the automatic gate below passes, or when the user
explicitly requests it and the required isolation can be provided safely.

`ISOLATED` means a single accountable orchestrator owns one integration
worktree and one integration/delivery branch while bounded workers use their
own local branches and worktrees. The only supported v1 composition is
`parallel_strategy: COMPOSE`: non-overlapping worker results contribute to one
centrally integrated result. The only supported integration strategy is
`integration_strategy: CHERRY_PICK`; the policy describes the behavior rather
than requiring a particular Git command. There is no alternative-implementation
selection, best-of-N, stacked-PR, or `SELECT_ONE` path.

The selected mode may be `ISOLATED` even though foundation, integration, and
some waves are sequential. It authorizes the use of isolated writable workers
where useful; it does not require every lifecycle stage to run in parallel.

## Automatic ISOLATED Gate

Automatic `ISOLATED` routing requires every condition below to be true:

1. At least two writable tasks can run concurrently.
2. Their dependencies are already satisfied.
3. Their allowed write scopes do not overlap.
4. Shared and generated artifacts have one explicit owner.
5. Each task has independently observable acceptance criteria.
6. Each task has realistic worker-level validation.
7. A stable interface or foundation exists between workers.
8. Runtime resources can be safely isolated.
9. Parallelism is expected to materially reduce the critical path or context
   interference.
10. One orchestrator remains accountable for integration and final acceptance.

Reject or serialize parallel execution when:

- workers would modify the same files, symbols, or generated artifacts
- a shared schema, migration, contract, or architecture remains unsettled
- a root lockfile would be modified independently by several workers
- tasks require frequent cross-worker decisions
- work is dominated by one ordered reasoning chain
- the environment shares unsafe mutable resources
- repository submodule behavior is unverified
- integration overhead is likely to exceed the benefit

Record the gate evidence and the rejected conditions in the routing reason.
Do not infer that a large ticket, many files, or a known provider satisfies the
gate.

## Provider Boundary

After routing selects `ISOLATED`, load
`.swe-forge/policies/provider-selection.md`. The provider must satisfy the
isolated worker contract; the provider does not define task acceptance,
contracts, validation, Git integration, delivery authorization, or final
review. `NATIVE` and `HERDR` are provider values, not topology values. Herdr
is optional and must not be installed automatically.

## Routing Procedure

1. Record the requested mode; use `AUTO` when no explicit topology was
   supplied.
2. Record any explicit provider preference separately; use `AUTO` when none
   was supplied. A leading `herdr` token is not a topology alias. Return
   migration guidance to use `isolated` and request Herdr as a provider
   preference instead of silently accepting it as a mode.
3. Identify the smallest unit that can be solved and verified together.
4. For `AUTO`, evaluate independent ownership and the full isolated gate.
5. For an explicit topology, honor the topology when available without
   bypassing safety, validation, scope, provider, or delivery authorization.
6. Reject parallelization when writable scopes or shared ownership conflict.
7. Prefer native subagents for independent read-only work and sequential
   bounded writable delegation when they are sufficient.
8. If `ISOLATED` is selected, apply provider selection and record its reason,
   provider state, worker limit, strategy, and fallback plan.
9. Re-evaluate the mode if evidence shows that isolation causes conflicts or
   unnecessary overhead. Do not downgrade while doing so if required safety
   would be lost.
10. Invoke `.swe-forge/workflows/isolated-execution.md` only after routing and
    provider selection choose `ISOLATED`.

## Safety Rules

- two writing workers must never share a checkout concurrently
- read-only research may use the integration checkout
- every isolated worker has a dedicated worktree and local branch
- isolated work is integrated centrally and sequentially in planned order
- a worker cannot change the run topology or provider without orchestrator
  approval
- worker branches cannot be pushed or used to create PRs
- unavailable tooling triggers fallback, not fabricated success
- a provider lifecycle status never replaces a structured result, Git evidence,
  validation, or central integration

## Fallback Order

When a selected provider or topology is unavailable or ineffective:

1. reduce `ISOLATED` to a native `SUBAGENTS` plan when isolation is not
   essential
2. reduce `SUBAGENTS` to sequential bounded work when independence disappears
3. use `SOLO` when one context is the safest execution unit
4. return `BLOCKED` when required isolation would be lost, no safe fallback
   exists, or the user prohibited fallback

Record the original request, provider limitation, selected fallback, and why
that fallback preserves or fails the required isolation. Do not create a fake
generic provider that cannot reliably supervise workers.

## Examples

```text
requested_mode: AUTO
execution_mode: SOLO
requested_provider: AUTO
execution_provider: NONE
parallel_strategy: NONE
integration_strategy: NONE
requested_delivery: GUIDED
delivery_mode: GUIDED
reason: Single localized behavior change with tightly coupled implementation and test.
fallback_used: no
```

```text
requested_mode: AUTO
execution_mode: SUBAGENTS
requested_provider: AUTO
execution_provider: NONE
parallel_strategy: NONE
integration_strategy: NONE
requested_delivery: PR
delivery_mode: PR
reason: API research, UI research, and test strategy are independent read-only tasks; implementation is sequential because the API contract and UI behavior are coupled.
fallback_used: no
```

```text
requested_mode: AUTO
execution_mode: ISOLATED
requested_provider: AUTO
execution_provider: NATIVE
provider_reason: The harness launches two writable workers from the exact integration SHA, gives each a dedicated worktree, returns structured results, and leaves central integration with the orchestrator.
parallel_strategy: COMPOSE
integration_strategy: CHERRY_PICK
requested_delivery: PR
delivery_mode: PR
reason: Two ready package-owned writable tasks have separate worktrees, isolated resources, independently validated outcomes, and a stable shared foundation; central integration remains accountable.
fallback_used: no
```
