# Isolated Execution Workflow

Use this workflow only after `workflows/ticket.md` has selected
`routing.current: ISOLATED` and provider capability evidence has been recorded.
It defines the isolated operational sequence; authorization remains canonical
in `policies/delivery.md`, result shape in `contracts/result-bundle.md`, and
Git/evidence enforcement in `.swe-forge/tools/swe-forge-isolated-gate`.

The v1 composition is `parallel_strategy: COMPOSE`: non-overlapping worker
results contribute to one centrally integrated result. The integration strategy
is `CHERRY_PICK` as the behavioral description of applying transfer commits in
planned order. There are no alternative implementations, best-of-N selection,
stacked PRs, worker PRs, recursive workers, schedulers, or automatic merges.

## Boundaries and plan

An isolated ticket has exactly one integration/delivery branch and one
orchestrator-owned integration worktree. The invocation checkout remains
untouched. Worker branches/worktrees are local-only, ephemeral resources carrying a
worker-local transfer commit. Only the integration branch may be pushed and exactly one final PR
may be created. At most two concurrent writable workers are used by default.

Before creating worker resources:

1. complete the shared foundation (contracts, interfaces, schemas, fixtures,
   architecture, dependency decisions, and generated-artifact ownership)
2. prove hard eligibility and economic parallel value
3. record provider capabilities and choose `NATIVE` or `HERDR` only when all
   mandatory capabilities are proven
4. prepare one setup checkpoint containing integration branch/worktree, provider
   evidence, worker count, current wave, task ownership, shared-artifact owner,
   exact worker base SHA, integration order, runtime resources, and cleanup
5. in `GUIDED`, wait for `continue`; in `PR`, use the accepted plan

An explicit `isolated` token selects a topology but does not authorize concrete
resources before planning. The exact meanings of `continue`, `go`, and PR
authorization are in `policies/delivery.md`.

Represent tasks as a dependency DAG. Every writable task records objective,
dependencies, allowed and forbidden scope, shared artifacts and one owner,
acceptance, worker validation, exact `base_sha`, wave, integration order,
worktree identity, and environment isolation. All tasks in one wave start from
the same exact integration SHA. Integration follows dependencies and the
recorded plan; completion order never determines integration order.

Immediately before launch, render the `worker_briefing` projection from the
canonical task and run state. For a task with completed dependencies, the root
adds only the B-relevant `dependency_digest` derived from each accepted
structured result; it never forwards a full result or opens a worker channel.
An isolated writable briefing must include the complete `isolated_execution`
safety section from `../contracts/worker-brief.md`: provider/backend, worker and
integration Git identity, exact base and checkpoint SHAs, ownership,
environment isolation, per-action authorization, local-only transfer,
integration order, and result bundle. The digest is additive and does not
shorten those fields, expand scope, or change the central integration plan. It
must still omit unrelated root state, transcripts, ticket history, and pasted
repository contents.

## Worker lifecycle

For each ready wave:

1. create no more than two dedicated local worker branches/worktrees from the
   exact recorded base
2. keep workers out of the integration checkout and prohibit worker delivery
   actions
3. send each worker only its rendered briefing (including any compact,
   accepted dependency digest), canonical role, relevant repository-instruction
   references, and fixed result-bundle contract; workers never message peers
4. collect one fixed `result/` bundle per writable worker
5. run `swe-forge-isolated-gate validate-result`, which checks actual worktree
   and branch identity, exact base/head, declared commits and changed paths,
   allowed scopes, cleanliness, fingerprint, planned worker checks, and
   unauthorized remote refs
6. wait for every worker in the wave; lifecycle completion alone is never
   acceptance evidence
7. preserve blocked, failed, dirty, stale, or ambiguous worker resources

The fixed bundle is:

```text
result/meta.tsv commits.txt files.txt validations.tsv scope-exceptions.txt
result/staged.txt result/unstaged.txt result/untracked.txt resources.tsv
```

This is the `ISOLATED_WRITABLE` profile from `../contracts/result.md`, but the
bundle in `../contracts/result-bundle.md` remains the sole machine-valid shape.
Do not accept a reduced ordinary `WRITABLE` result for an isolated worker.

`meta.tsv` has schema version 1 and fixed fields. No missing, repeated,
unknown, malformed, control-character, short-SHA, `eval`, or unrestricted path
content is accepted. Required worker checks pass; conditional checks pass or
have a reasoned not-applicable result; unavailable required checks block.

## Central integration

The orchestrator integrates sequentially in recorded `integration_order`:

1. verify the next planned worker with the isolated gate
2. verify a clean integration checkout at the expected checkpoint
3. record the pre-apply integration SHA
4. preflight or apply the worker transfer with a safe documented Git operation
   (`cherry-pick --no-commit` is the reference operation)
5. if conflict occurs, record it, preserve worker resources, abort only the
   operation demonstrably started, and prove restoration to the pre-apply
   checkpoint; otherwise return `BLOCKED`
6. run integrated validation against the candidate fingerprint
7. create one central integration commit only after validation passes
8. record the full source-to-integration mapping
9. verify the new integration head, then continue to the next planned unit
10. run wave-level validation after every wave

Do not blindly merge branches or copy worktrees. Do not silently resolve
conflicts. If integration is interrupted after transfer application but before
the central commit, preserve the worker and integration state and use the
recover operation; never hard-reset or force-clean ambiguous state.

## Runtime resources

Worktrees do not isolate ports, databases, Docker projects, temporary paths,
external services, credentials, or Git refs. Record setup, allowlisted ignored
files, unique resources, external effects, and cleanup. Inspect setup commands
before execution. Serialize or block when safe isolation is unavailable.

## Verification, delivery, and cleanup

Require worker-level validation, integrated-state validation after each
transfer, and integrated validation after each unit,
wave-level validation, complete repository checks, fresh independent review,
repair validation, and final ticket comparison. PR mode performs validated
central commits, one final integration-branch push, and one final PR only after
these gates. It never pushes workers, publishes, deploys, or merges.

Cleanup eligibility is separate from cleanup execution. The guard verifies all
accepted commits are mapped, the worker is clean, its worktree identity is
still observable, and no ambiguity exists. Use only safe non-force Git cleanup
for eligible resources; never use forced removal automatically. Preserve and report dirty, stale, manually removed,
conflicting, or unresolved resources. Keep the integration branch for the PR.

## Recovery state

Run state must distinguish `invocation_checkout` from `delivery_checkout`,
record provider capabilities, hard eligibility and economic value, worker
bases/heads, waves, environment resources, source-to-integration mappings,
checkpoint and conflict evidence, action authorization, review, and cleanup.
A resumed run inspects actual Git/provider/process state before trusting stale
state. If proof is unavailable, preserve resources and block rather than guess.
