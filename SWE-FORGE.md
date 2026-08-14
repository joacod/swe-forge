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
  separately authorized. `PR` follows the bounded delivery actions in
  `policies/delivery.md`; guided approval never implies publication, deployment,
  or merge authorization.

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

Reserved-token parsing, raw-argument preservation, incomplete-input handling,
and Herdr migration guidance are owned by the loaded ticket procedure. The
examples above describe the supported public grammar without duplicating its
parser rules here.

The ticket workflow loads `.swe-forge/policies/execution-routing.md` before the
final topology decision. That policy owns the routing fields, hard eligibility,
economic parallel-value decision, and safe fallback. Topology and provider
remain separate dimensions: non-isolated runs record
`execution_provider: NONE`, `parallel_strategy: NONE`, and
`integration_strategy: NONE`, while an isolated run uses only the provider and
strategies proven by the loaded provider-selection policy. Explicit selections never
bypass safety, validation, scope, or delivery authorization.

### SOLO

`SOLO` keeps orchestration and implementation in one context for small, tightly
coupled, sequential, or shared-surface work. It still performs discovery,
specification, proportional validation, final-diff inspection, and evidence
reporting without artificial workers.

### SUBAGENTS

`SUBAGENTS` uses native workers when independent research, bounded delegation,
or fresh review materially improves the result without concurrent writable
worktrees. Read-only work may be parallel; writable work is sequential in one
checkout unless dedicated worktrees make the topology `ISOLATED`. The
orchestrator retains task ownership, integration, and acceptance. If workers
are unavailable, fall back to sequential execution or `SOLO` rather than
simulating them with unrelated processes. Detailed delegation and worker
boundaries are owned by the loaded delegation policy and contracts.

### ISOLATED

`ISOLATED` is selected only when the routing gate and provider capability proof
make concurrent writable work safe and useful. It authorizes a workflow shape,
not a provider or concrete resources. After selection, load
`.swe-forge/workflows/isolated-execution.md`, the provider-selection policy,
and the selected provider runbook; the isolated workflow owns waves, worktrees,
central integration, recovery, and cleanup. The orchestrator remains accountable
for one integration/delivery branch and one final PR; worker branches are
local-only.

## Delivery Modes

### GUIDED (default)

`GUIDED` keeps the user in the loop through bounded review checkpoints. The
workflow creates or reuses one safe delivery checkout for normal execution and
uses the isolated plan only when that topology is selected. Before any setup or
writable operation, load `.swe-forge/policies/delivery.md`; it owns branch,
resource, checkpoint, commit, and cleanup authorization. `continue`, `go`, and
all other action meanings come from that policy. Guided approval never implies
push, PR creation, publication, deployment, or merge.

### PR

`PR` is the opt-in low-touch path. The normal ticket procedure loads
`.swe-forge/policies/specification.md` before clarification or specification
behavior; `PR` additionally loads `.swe-forge/contracts/working-spec.md` before
building the transient working spec. Before writable work or delivery choices,
load `.swe-forge/policies/delivery.md`. The transient spec owns an ordered
commit plan and `review_focus`, and the orchestrator validates and commits each
cohesive step before starting the next. It then runs final verification and
independent review before one authorized push and one final PR on the single
delivery branch. Worker branches are never pushed and worker PRs are never
created. PR mode never merges; project-facing PR content follows the delivery
policy, while evidence and receipts remain private under their canonical policy
and contract.

The atomic `git-commit`, `git-push`, `git-pr`, and `git-sync` actions load and
follow `.swe-forge/policies/delivery.md` separately. Pushing never creates a PR
as a side effect, and post-merge sync verifies the provider state first.

## Model Routing

Delegated model assignment uses capability classes and fallback semantics from
`.swe-forge/policies/model-routing.md`; load that policy before assigning a
worker capability. Harness adapters may map those classes to user-selected
models or harnesses. Model diversity is optional and canonical files do not
name providers or model identifiers.

## Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The
lifecycle is:

1. Ingest the immutable raw invocation and parsed ticket constraints.
2. Discover repository evidence, quality gates, and any explicitly named
   optional skill.
3. Specify observable acceptance criteria after loading the specification
   policy and, in `PR`, build the transient working spec after loading its
   contract.
4. Architect the smallest compatible approach and identify risks.
5. Decompose only where useful, loading delegation, role, model, and result
   sources before assigning work.
6. Load routing policy before selecting `SOLO`, `SUBAGENTS`, or `ISOLATED`, and
   load provider and isolated workflow sources only for an isolated result.
7. Load verification before selecting validation and evidence before using the
   executable gate, fingerprints, freshness, or receipts.
8. Load delivery before writable setup or delivery decisions, then implement
   bounded dependency waves and integrate centrally when needed.
9. Load context or failure-recovery policy only when their triggers occur.
10. Verify the current candidate, review from fresh context when warranted,
    repair relevant findings, and compare the final diff with the ticket.
11. Apply the canonical Acceptance Gate, perform only authorized delivery, and
    report the result.

The workflow must adapt its depth. A typo does not require an architect,
security reviewer, isolated worktree, or ceremonial test plan.

The canonical ownership/load map is:

```text
activation and lifecycle -> SWE-FORGE.md
ticket procedure -> workflows/ticket.md
isolated operational sequence -> workflows/isolated-execution.md
specification and clarification -> policies/specification.md
execution routing and eligibility -> policies/execution-routing.md
provider selection and capability -> policies/provider-selection.md
delegation boundaries -> policies/delegation.md
model assignment -> policies/model-routing.md
verification strategy and quality gates -> policies/verification.md
evidence semantics and receipts -> policies/evidence.md
delivery and local-resource authorization -> policies/delivery.md
context continuity and compaction -> policies/context.md
failure classification and recovery -> policies/failure-recovery.md
specialist-skill selection -> policies/specialist-skills.md
roles -> agents/*
contracts and data shapes -> contracts/*
provider runbooks -> providers/*
harness loading -> adapters/*
```

Minimal load sets are stage-triggered rather than a second workflow.
Every normal run loads `SWE-FORGE.md`, `workflows/ticket.md`, the orchestrator role, and
`.swe-forge/policies/specification.md` before specification or clarification.
`PR` additionally loads `.swe-forge/contracts/working-spec.md` before building
the transient working spec; `AUTO` loads execution-routing before its topology
decision; delegation loads its policy, relevant roles, and contracts; delivery,
verification, and evidence load before their first operation. Context and
failure-recovery remain lazy.
`ISOLATED` additionally loads provider-selection, delivery, result-bundle,
run-state, isolated-execution, the selected provider runbook, and the isolated
Git/evidence guard only after the isolated decision.

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

Before any writable setup or edit, load and follow
`.swe-forge/policies/delivery.md`. It owns checkout classification, protected
branches, canonical task/integration branch naming, local resources, action
authorization, and the pre-edit baseline. A normal run has one delivery branch;
an isolated run has one orchestrator-owned integration/delivery branch and
local-only worker resources. The isolated workflow owns its operational
identities and integration evidence.

Dirty, detached, protected, or ambiguous state is preserved and reported rather
than reset, cleaned, stashed, overwritten, or delivered. Merging, publication,
deployment, and other external effects remain separately authorized.

## Failure Handling

Workers and providers never replace structured results, Git evidence, or
validation. On `BLOCKED` or `FAILED`, load and follow
`.swe-forge/policies/failure-recovery.md`; it owns retry limits, failure
classification, debugger escalation, conflict handling, and conservative
cleanup. Preserve ambiguous resources and report unresolved evidence rather
than silently changing status or looping.

## Acceptance Gate

Declare success only when all applicable conditions are met:

- original acceptance criteria are accounted for
- a testing decision is recorded; applicable behavior has relevant automated
  or focused manual/reproduction evidence, or an evidence-backed
  not-applicable rationale
- relevant tests pass
- relevant typecheck, lint, build, and repository checks pass
- no blocking in-scope review finding under `.swe-forge/contracts/review.md`
  remains, and every review-focus acceptance criterion has been checked
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

Begin the final harness output with a short `Work summary` in plain human
language. Explain what changed and what it improves, then add only material
notes when they help; scale the summary to the ticket and omit empty sections.
Keep this summary separate from the private receipt and the project-facing PR
description.

```text
Work summary:
- <what changed and what it improves>
- <material notes, when useful>
```

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
