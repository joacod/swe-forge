# SWE Forge Specification

SWE Forge is an explicitly invoked, portable software-engineering workflow for
AI coding harnesses. It sits above the harness and chooses how much process is
useful for the current ticket. Execution topology (`SOLO`, `SUBAGENTS`, or
`ISOLATED`) is independent from delivery mode (`GUIDED` or `PR`). An isolated
run may use a native harness capability or the optional Herdr execution
provider, but neither provider defines SWE Forge behavior.

## Activation Contract

SWE Forge must not activate because a task is difficult, because the
repository contains this file, or because a harness can create subagents.

Activation requires an explicit user request. Recognized forms include:

- `Use SWE Forge`
- `Follow SWE Forge`
- an explicit reference to `SWE-FORGE.md`
- a supported command such as `/swe-forge`

If the user has not explicitly invoked SWE Forge, use the harness normally and
do not load this specification or its specialist roles as workflow
instructions.

When the user explicitly invokes SWE Forge:

1. Treat the user's ticket as the workflow input.
2. Read this file completely enough to follow the activation and acceptance
   rules.
3. Read `.swe-forge/workflows/ticket.md` for the ticket procedure.
4. Read only the role, contract, and policy files needed by the selected
   topology, delivery mode, and task risks.

## Canonical Sources

The source of truth is deliberately separated:

- `SWE-FORGE.md` defines activation, principles, lifecycle, and acceptance.
- `.swe-forge/workflows/` defines executable workflow procedures.
- `.swe-forge/agents/` defines harness-neutral role responsibilities.
- `.swe-forge/contracts/` defines structured task, result, review, receipt,
  and state formats.
- `.swe-forge/policies/` defines routing, provider selection, delegation,
  model, specification, delivery, verification, evidence, recovery, and
  optional specialist-skill rules. `policies/delivery.md` is the sole
  canonical owner of delivery and local-resource authorization.
- `.swe-forge/providers/` defines optional execution-provider runbooks such as
  Herdr without defining canonical workflow behavior.
- `.swe-forge/adapters/` exposes those definitions through harness-native
  features without redefining them.

No adapter, skill, command, or vendor-specific instruction is canonical.

## Operating Principles

- Choose the smallest execution topology that can solve the ticket reliably.
- Prefer a strong single agent over pointless delegation.
- Prefer native subagents over external orchestration when they are sufficient.
- Use `ISOLATED` only when concurrent writable work needs separate execution
  environments and the automatic gate in the routing policy passes.
- Select an execution provider separately from the topology. A provider may
  launch and supervise workers; the root orchestrator still owns integration
  and final acceptance.
- Keep Herdr optional. It is an execution provider, not a harness, workflow, or
  reason to select isolated execution by itself.
- Use hub-and-spoke coordination through one orchestrator.
- Give workers bounded tasks with explicit ownership and acceptance criteria.
- Consume structured worker results rather than relying on conversational
  memory.
- Keep read-only research separate from writable implementation.
- Never allow concurrent writing workers to edit the same checkout.
- Treat verification evidence as stronger than confidence or code inspection.
- Make safety-critical boundaries executable when a compatible helper is
  available, while keeping planning and reasoning adaptive.
- Make a risk-proportional testing decision for every ticket: prefer focused
  behavioral tests at observable seams, use existing coverage when sufficient,
  and record focused manual or reproduction evidence when automation is not
  justified or available. Do not impose blanket coverage targets or mandatory
  TDD.
- Inspect validation commands before execution and require explicit
  authorization for migrations, deploys, publication, production access, or
  other external or shared-environment effects.
- Do not expand scope through opportunistic refactoring.
- Keep specialist skills optional and on demand. Load one only when the user
  requests it or an already available skill has a clear declared match and an
  expected benefit for the ticket.
- Treat specialist-skill guidance as advisory. It never overrides the ticket,
  repository instructions, canonical Forge files, validation gates, or delivery
  authorization.
- Keep a transient working spec proportional to the ticket; never create
  ticket-specific planning documents in the repository just to coordinate one
  session.
- Treat context pressure as a harness lifecycle event: at a reliable near-limit
  signal, persist the short working state, compact at a safe boundary before
  continuing, then re-read state and inspect Git. Never assume a universal
  context signal or launch a duplicate retry for host-managed overflow recovery.
- Preserve a human checkpoint in `GUIDED` mode and keep delivery actions
  separately authorized.
- Keep commits, pushes, publication, and global configuration changes
  separately authorized. `PR` mode authorizes only the bounded local setup,
  worker transfer commits, validated central commits, one final push, and one
  final PR described by `policies/delivery.md`; `go` authorizes only one
  reviewed guided central commit. Never infer publication, deployment, or merge
  authorization.

## Execution Topology

`/swe-forge <ticket>` uses automatic routing by default. The orchestrator
discovers enough repository evidence to choose the smallest useful topology; it
does not need a separate decision agent.

Harness commands may also accept an explicit topology as the first argument:

```text
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
/swe-forge isolated <ticket>
```

Execution topology and delivery mode are orthogonal. The default delivery mode
is `GUIDED`; use `pr` only when the user wants the run to continue through
pull-request creation:

```text
/swe-forge <ticket>                 # GUIDED, automatic topology
/swe-forge pr <ticket>              # PR delivery, automatic topology
/swe-forge solo pr <ticket>         # explicit topology plus PR delivery
/swe-forge isolated <ticket>        # GUIDED, explicit isolated topology
/swe-forge isolated pr <ticket>     # PR delivery, explicit isolated topology
/swe-forge pr isolated <ticket>     # same, delivery token first
```

The parser accepts a delivery token before or after an explicit topology.
Lower-case `pr`, `guided`, `solo`, `subagents`, and `isolated` are reserved in
their command positions; other ticket text is preserved. A leading lowercase
`herdr` is not an execution-topology alias. The ticket procedure returns
migration guidance to use `isolated` and to request Herdr as an execution-
provider preference instead of silently accepting that token as a mode. A
missing ticket after either token is incomplete input.

Every run records the request, selected modes, provider decision, hard
isolated eligibility, economic parallel value, and reasons:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why the selected provider satisfies isolated requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest useful topology>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>

isolated_eligibility: status: eligible | ineligible; evidence_ref: <ref>; blockers: []
parallel_value: status: beneficial | marginal | unknown; rationale: <evidence>; overridden_by_user: true | false
```

An explicit isolated request cannot bypass hard eligibility. If hard eligibility
fails, route safely to `SUBAGENTS` or `SOLO`, or return `BLOCKED`. Explicit
selection may override only economic preference.

`execution_provider` is meaningful only when `execution_mode` is `ISOLATED`.
Non-isolated runs record `execution_provider: NONE`,
`parallel_strategy: NONE`, and `integration_strategy: NONE`. Isolated v1
supports only `parallel_strategy: COMPOSE`: several non-overlapping worker
results contribute to one centrally integrated result. It does not select an
alternative implementation, compare best-of-N results, create stacked PRs, or
use `SELECT_ONE`.

An explicit topology overrides topology preference, not safety, validation,
scope, or delivery authorization. An explicit `pr` delivery token requests
low-touch delivery but does not bypass safety, validation, scope, or review.
Apply the provider and topology fallback policy when a requested capability is
unavailable. Block instead when falling back would make required isolation
unsafe or the user prohibited fallback.

### SOLO

Use `SOLO` when the work is small, tightly coupled, sequential, or easier to
verify in one context. The current agent acts as orchestrator and implementer.

Even in `SOLO`, perform lightweight discovery, specify acceptance criteria,
plan the change, run relevant validation, inspect the final diff, and report
evidence. Do not create artificial workers.

### SUBAGENTS

Use `SUBAGENTS` when the current harness provides native workers and
independent research, architecture analysis, bounded implementation, or fresh
review will materially improve the result without concurrent writable
worktrees.

`SUBAGENTS` supports parallel read-only work and sequential bounded writable
delegation in one checkout. A writable worker must not edit the integration
checkout concurrently with another writer. Any concurrent writable workers
using separate worktrees are classified as `ISOLATED`, even when the current
harness provides those worktrees natively. Strong context isolation by itself
does not justify `ISOLATED`; native read-only workers are usually sufficient.
Task difficulty, file count, or the presence of Herdr does not justify
`ISOLATED`.

Use approximately two to four active workers for independent read-only work
unless evidence justifies a different limit. Keep the orchestrator responsible
for task dependencies, shared state, integration, and acceptance. Workers must
not recursively create arbitrary workers unless the task contract explicitly
authorizes it. If native subagents are unavailable, execute the work
sequentially or choose `SOLO`; do not simulate subagents with unnecessary
operating-system processes.

### ISOLATED

Use `ISOLATED` only when the automatic isolated-routing gate passes or the
user explicitly requests it and the requested isolation can be provided
safely. The gate requires at least two ready writable tasks with non-overlapping
ownership, independently observable acceptance and validation, an explicit
owner for shared artifacts, a stable foundation, safe runtime isolation,
material critical-path or context benefit, and one accountable orchestrator.
The routing policy also lists conditions that require serialization.

`ISOLATED` authorizes the workflow shape, not an implementation provider. The
provider-selection policy requires structured proof for concurrent writable
workers, dedicated worktrees, exact bases, integration checkout protection,
structured results, wait/inspect/cancel/cleanup lifecycle, and central
integration. `NATIVE` is not selected while a mandatory capability is unknown or
unavailable. Herdr remains optional and must pass its `HERDR_ENV=1` ownership
guard. If neither provider can safely preserve isolation, fall back to
sequential `SUBAGENTS` or `SOLO` when safe, or return `BLOCKED`.

After routing selects `ISOLATED`, load
`.swe-forge/workflows/isolated-execution.md`. That workflow owns the dependency
DAG, wave barriers, integration worktree, ephemeral worker branches and
worktrees, environment resources, central commit construction, recovery, and
conservative cleanup. It produces one integration/delivery branch and exactly
one final PR for the ticket; worker branches are never pushed and never receive
PRs.

## Delivery Modes

### GUIDED (default)

`GUIDED` keeps the user in the loop without forcing one large review. For a
normal run from a clean protected default branch, it automatically creates one
dedicated task branch and reuses that branch for the whole run. For an
`ISOLATED` run, the isolated workflow instead creates one run-owned integration
worktree and one safe integration/delivery branch, then plans bounded local
worker worktrees. The orchestrator plans cohesive implementation slices,
validates each slice, and stops at a checkpoint with the diff boundary,
evidence, risks, and next step.

An explicit `isolated` invocation selects the topology but does not authorize
concrete resources before planning. The canonical setup checkpoint,
`continue`, `go`, and `PR` meanings are owned by
`.swe-forge/policies/delivery.md`; this section only summarizes them. In
particular, `continue` authorizes only the exact reviewed local setup, `go`
authorizes one central commit, and neither authorizes push, PR creation,
publication, deployment, or merge.

The user may reply `continue` to proceed without delivery, `revise: ...` to
reshape the slice, or `go` to commit the reviewed slice with a generated,
repository-appropriate message and continue. A guided run never pushes,
creates a PR, or merges merely because a slice was approved; `go` authorizes
only its local delivery-branch commit.

### PR

`PR` is the opt-in low-touch path. It runs the lightweight specification policy
when the ticket needs clarification, keeps the working spec outside the
repository, and proceeds through implementation without interactive
checkpoints. Before the first edit, the working spec contains an ordered commit
plan with one cohesive objective, scope, targeted validation, and commit subject
per step. The orchestrator validates and commits each step before beginning the
next; it does not accumulate a broad diff and create one catch-all commit. A
one-step ticket remains one commit rather than being split artificially. For
`SOLO` and `SUBAGENTS`, it uses the one dedicated delivery branch. For
`ISOLATED`, it uses one integration/delivery branch, planned local worker
resources, and central integration. It creates one local commit after each
validated slice or integration unit, then runs final verification and fresh
review before pushing the integration/delivery branch and creating one pull
request. Worker branches are never pushed and worker PRs are never created. It
ends with a concise PR URL and never merges. It does not skip automated checks
or independent review. After the PR URL exists, generate a compact receipt using
`.swe-forge/contracts/receipt.md` and add it to the PR description when the
provider supports updating the description. Never include transcripts or claim
checks that were not run.

Use the atomic delivery actions described by `.swe-forge/policies/delivery.md`
for guided follow-up: `git-commit`, `git-push`, `git-pr`, and `git-sync`.
Pushing must never unexpectedly create a PR. After a human merges a PR, say
`merged` in the active run or invoke `git-sync`; Forge verifies the PR state
before returning to the remote default branch and fast-forwarding it.

## Model Routing

The canonical workflow uses capability classes, not provider names or model
identifiers:

```yaml
orchestrator: strongest-reasoning
architect: strongest-reasoning
researcher: fast-capable
implementer: strong-coding
refactor-specialist: strong-coding
test-engineer: strong-coding
reviewer: strong-independent-reasoning
debugger: strongest-reasoning
security-reviewer: strongest-reasoning
performance-reviewer: strongest-reasoning
```

Harness adapters may map capabilities to user-selected models and harnesses.
Different models for implementation and review are optional, not required.

## Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The
lifecycle is:

1. Ingest the ticket, topology token, provider preference, delivery token, and
   constraints.
2. Discover relevant repository evidence and evaluate any explicitly supplied
   or clearly matching optional specialist skill using its policy.
3. Specify observable acceptance criteria and blocking ambiguity; in `PR` mode,
   create a transient working spec and run the brief alignment interview only
   when the ticket is underspecified. For long-running or context-risk work,
   record the host capability signal, safe compaction action, overflow recovery,
   and external durable-state reference.
4. Architect the smallest compatible approach.
5. Decompose only where useful and define bounded task ownership or guided
   review slices.
6. Route explicitly to `SOLO`, `SUBAGENTS`, or `ISOLATED`, then select a
   provider only when the selected topology is `ISOLATED`.
7. Select an appropriate test and validation strategy.
8. If routing selects `ISOLATED`, load the isolated-execution workflow after the
   foundation and provider decision; otherwise implement dependency waves in
   the selected checkout.
9. Implement dependency waves within task scope, stopping at guided
   checkpoints when `delivery_mode` is `GUIDED`. At a reliable near-limit
   signal, persist state and compact before the next continuation; after any
   compaction or overflow recovery, re-read state and verify the actual Git
   boundary before resuming.
10. Integrate isolated work centrally, with final commits built and validated
    by the orchestrator.
11. Verify with relevant repository quality gates and record current-HEAD
    evidence when using the executable gate.
12. Review from fresh context using evidence, not implementation chatter.
13. Repair relevant findings and rerun affected validation.
14. Compare the final diff against the original ticket and acceptance criteria.
15. Perform only the delivery actions authorized by the selected mode or a
    later explicit user instruction.
16. Report the result concisely.

The workflow must adapt its depth. A typo does not require an architect,
security reviewer, isolated worktree, or ceremonial test plan.

The canonical ownership/load map is:

```text
activation and lifecycle -> SWE-FORGE.md
ticket procedure -> workflows/ticket.md
isolated operational sequence -> workflows/isolated-execution.md
routing eligibility -> policies/execution-routing.md
provider capability -> policies/provider-selection.md
authorization and delivery -> policies/delivery.md
context continuity and compaction -> policies/context.md
evidence semantics -> policies/evidence.md
data shapes -> contracts/*
provider command translation -> providers/*
harness loading -> adapters/*
```

Minimal load set: `SOLO` needs `SWE-FORGE.md`, `workflows/ticket.md`, the
orchestrator role, and relevant verification/evidence/delivery contracts;
load `policies/context.md`, the working-spec contract, and the run-state
contract for long-running or context-risk tickets. `SUBAGENTS` additionally
loads task/result/review contracts and the relevant worker roles; `ISOLATED`
additionally loads execution-routing, provider-selection, delivery,
result-bundle, run-state, the isolated workflow, the selected provider runbook,
and the isolated Git/evidence guard contract.
## State and Contracts

Use the contracts under `.swe-forge/contracts/` when tasks are delegated or
state must survive context changes. In `PR` mode, the working-spec contract
provides a short behavior-first brief; it is temporary and is not a repository
artifact. For context-risk work, it also records the capability source,
pre-continuation compaction action, overflow recovery, and durable-state
reference. When a specialist skill is considered, the working spec records its
source, selection status, and reason for not or using it. An optional executable
evidence ledger may support preflight, checkpoints, validation, and receipt
generation; it is not a second source of truth. A run state is temporary by
default and should live outside the repository, for example:

```text
$TMPDIR/swe-forge/<run-id>/run-state.yaml
```

If repository-local state is necessary, use an ignored path such as
`.swe-forge/runs/`. Never commit ticket-specific state, worker transcripts,
credentials, or generated logs. Isolated state distinguishes the integration
worktree and delivery branch from ephemeral worker worktrees and branches,
records provider and wave state, source-to-integration commit mappings,
environment resources, and cleanup status.

## Checkout And Delivery Safety

Before writable implementation, classify the checkout and record the baseline.
Treat repository-declared protected branches, the locally known remote default
branch, and conventional `main` and `master` as protected.

For `SOLO` or `SUBAGENTS`, if a clean checkout is currently on a protected
default branch, the normal workflow automatically creates one safe, dedicated
non-protected task/delivery branch. If it is already on a suitable
non-protected branch or worktree, reuse that same branch for every slice.
Never create another normal delivery branch during the run.

For `ISOLATED`, leave the user's original invocation checkout untouched, create
one run-owned integration worktree, and create or reuse one safe
non-protected integration/delivery branch for the whole ticket. Give the
integration worktree exclusively to the orchestrator. Worker branches and
worktrees are bounded, local, ephemeral transfer resources; they are never
delivery branches, never pushed, and never used to create PRs. Use namespaced
names that include the run ID and task ID. The isolated workflow records the
invocation and delivery checkout identities, branch, base and checkpoint SHAs,
provider capabilities, worker identities, and cleanup evidence.

If the checkout is dirty, detached, or cannot be classified safely, stop and
ask the user to resolve it; do not reset, clean, stash, overwrite, or include
pre-existing user changes. Do not edit or commit on a protected branch. If the
requested branch name already belongs to another task, use a safe run suffix or
ask rather than silently reusing it. A user-provided branch or worktree
preference may replace the default when it passes the same gates.

Record a pre-edit baseline containing invocation checkout identity, delivery
checkout setup, HEAD, branch, remote-default evidence, and staged, unstaged,
and untracked files. Branch/worktree setup and delivery authorization are
owned by `.swe-forge/policies/delivery.md`; this section only requires the
orchestrator to record the resulting state. An ambiguous request for extra
branches or worktrees requires clarification. Merging always requires a
separate explicit instruction and is not part of the ticket lifecycle.

## Failure Handling

Workers may return `DONE`, `BLOCKED`, or `FAILED`. A blocked worker does not
automatically terminate the run. The orchestrator may provide missing context,
retry once, invoke a debugger, serialize conflicting work, change strategy,
escalate capability, or complete the task itself. Agent lifecycle status never
replaces a structured result, Git evidence, validation, or central integration.

For isolated work, preserve worker branches and worktrees on conflicts or
ambiguous dirty state. Restore the integration worktree only to a recorded
clean checkpoint using a safe Git operation, re-evaluate ownership and
dependencies, and serialize or recreate the affected task from the current
integration head. Never force-clean ambiguous resources or silently resolve an
independence conflict.

Track retries and avoid infinite retry or review loops. Preserve the evidence
for unresolved failures in the final report.

## Acceptance Gate

Declare success only when all applicable conditions are met:

- original acceptance criteria are accounted for
- a testing decision is recorded; applicable behavior has relevant automated
  or focused manual/reproduction evidence, or an evidence-backed
  not-applicable rationale
- relevant tests pass
- relevant typecheck, lint, build, and repository checks pass
- no blocking review finding under `.swe-forge/contracts/review.md` remains
- no unintended changes remain
- the final integrated diff has been inspected
- any generated receipt is truthful, contains no transcript, and reports
  `ACCEPTED` only when its required evidence gate passes
- a normal ticket has one dedicated delivery branch; an isolated ticket has
  one integration/delivery branch and exactly one final pull request
- every accepted isolated worker commit has an integration mapping and final
  commits were built and validated centrally
- when context pressure occurred, the context recovery evidence records the
  host signal, compaction or manual-resume result, durable-state re-read, and
  Git/evidence recheck; when it did not occur, the run reports `not-observed`
- when `delivery_mode: PR`, the authorized commit, push, and pull-request
  actions complete or the run is reported `BLOCKED`; `GUIDED` may finish with a
  reviewed local diff and delivery actions not authorized
- cleanup preserves dirty, blocked, or unresolved resources and never claims
  removal without evidence

Do not claim a check passed when it was not run. Distinguish skipped checks,
unavailable tooling, and failures from successful validation.

Final status is deterministic: use `ACCEPTED` only when this gate passes, use
`BLOCKED` when a user decision, authorization, access, or environment change
can enable safe continuation, and use `FAILED` when attempted work remains
incorrect or the gate cannot be met within the ticket and recovery limits.

## Final Report

Return a concise report containing:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`
- requested and selected execution topology
- requested and selected provider when relevant, with reason and any fallback
- requested and selected delivery mode
- implementation approach and important decisions
- context capability/status and any compaction or overflow recovery evidence
- files changed
- testing decision, tests, and validation performed with results
- reviewer result and repaired findings
- assumptions and remaining risks
- delivery result (checkpoint, commit, push, PR URL, or explicit
  not-authorized status)
- receipt result or explicit not-generated status
- cleanup status and remaining resources when temporary state, processes,
  providers, or worktrees were used

Do not dump internal agent conversations. Report structured evidence and
decision-relevant summaries.
