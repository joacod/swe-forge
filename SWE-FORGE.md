# SWE Forge Specification

SWE Forge is an explicitly invoked, harness-agnostic software-engineering
workflow for AI coding harnesses. It takes one coding ticket through inspection,
planning, implementation, verification, review, and delivery. A run owns one
writable delivery checkout and one reviewable delivery outcome. Harness-native
subagents may assist with bounded work, but orchestration of concurrent
mutation of the canonical delivery candidate, worker fleets, external
orchestration, and multi-workspace integration are outside SWE Forge's scope.

The canonical workflow remains portable. Adapters expose asymmetric native
capabilities and use documented fallbacks; projection success or fixture
coverage does not by itself imply real harness validation, and feature parity is
not a project requirement. Current adapter maintenance and validation
confidence belong in [`docs/compatibility.md`](docs/compatibility.md).

## Activation Contract

SWE Forge must not activate because a task is difficult, because the repository
contains this file, or because a harness can create subagents.

Activation requires an explicit user request. Recognized forms include:

- `Use SWE Forge`;
- `Follow SWE Forge`;
- an explicit reference to `SWE-FORGE.md`; and
- a supported command such as `/swe-forge`.

If the user has not explicitly invoked SWE Forge, use the harness normally and
do not load this specification or its specialist roles as workflow
instructions.

When the user explicitly invokes SWE Forge:

1. treat the user's ticket as the workflow input;
2. read this file completely enough to follow the activation and acceptance
   rules;
3. read `.swe-forge/workflows/ticket.md` for the ticket procedure; and
4. read only the role, contract, and policy files needed by the selected
   topology, delivery mode, and task risks.

## Canonical Sources

The source of truth is deliberately separated:

- `SWE-FORGE.md` defines activation, principles, lifecycle, and acceptance;
- `.swe-forge/workflows/` defines executable workflow procedures;
- `.swe-forge/agents/` defines harness-neutral role responsibilities;
- `.swe-forge/contracts/` defines structured task, result, review, receipt, and
  state formats;
- `.swe-forge/policies/` defines routing, delegation, specification,
  delivery, verification, evidence, recovery, and optional specialist-skill
  rules; and
- `.swe-forge/adapters/` exposes those definitions through harness-native
  features without redefining them.

No adapter, skill, command, or vendor-specific instruction is canonical.

The active harness or orchestration environment owns model, provider, reasoning,
and runtime selection; SWE Forge never chooses models.

## Operating Principles

- choose the smallest execution topology that provides sufficient reliability
  and safe task ownership;
- prefer a strong single agent over pointless delegation; prompt length alone
  never selects a topology;
- delegate only independently evaluable work whose concise result materially
  reduces root coordination;
- make an early semantic scope decision before downstream workflow machinery;
  allow substantial cohesive work and reject only independently splittable or
  open-ended requests;

- keep canonical workflow logic dependent on semantic capabilities, not harness
  identity when the distinction can be expressed as a capability;
- allow asymmetric adapter capabilities and use the documented safe fallback
  when an optional capability is unavailable;
- during discovery, assess question shape separately from final topology;
  bounded read-only questions may use `DELEGATED_RESEARCH`, while coupled
  discovery stays `ROOT_ONLY`;
- use hub-and-spoke coordination through one root orchestrator;
- give workers bounded tasks with explicit ownership and acceptance criteria;
- keep complete task and run state root-owned and pass only the validated
  `worker_briefing/v1` projection to a worker;
- specify dependency and mutation semantics without prescribing the worker's
  physical execution environment, physical scheduling, or an active-worker
  count;
- neither require nor prohibit concurrent execution inside host-private worker
  environments; the adapter/runtime determines physical scheduling and
  isolation;
- require every writable delegated result to be materialized into the canonical
  delivery checkout and validated there before acceptance or dependent handoff;
- derive compact root-accepted `dependency_digest` facts for sequential
  dependent work; never open peer channels or forward a transcript;
- consume structured worker results rather than conversational memory;
- keep read-only research separate from writable implementation;
- concurrent mutation of the canonical delivery candidate is forbidden;
- treat verification evidence as stronger than confidence or code inspection;
- make safety-critical boundaries executable when a compatible helper exists;
- make a risk-proportional testing decision for every ticket;
- inspect validation commands before execution and require explicit authorization
  for migrations, deploys, publication, production access, or other shared
  effects;
- keep specialist skills optional and on demand;
- keep a transient working spec proportional to the ticket; and
- preserve human checkpoints in `GUIDED` mode while keeping delivery actions
  separately authorized.

## Early Scope Decision

After enough lightweight, root-owned repository discovery to understand the
requested outcomes and relevant surfaces, but before broad discovery or any
downstream workflow machinery, the root/orchestrator makes exactly one
transient semantic decision:

```text
scope_decision: PROCEED | TOO_BROAD
```

The decision asks:

> Can this request reasonably produce one cohesive reviewable PR with one
> primary outcome and a bounded implementation surface?

Choose `PROCEED` when the answer is yes. A substantial implementation, many
changed files, or several ordered implementation steps can still be one
cohesive outcome. Do not use work amount, prompt length, or file count as a
proxy for breadth.

Choose `TOO_BROAD` when the request is effectively an epic, bundles multiple
independently implementable improvements, asks for an open-ended rewrite, or
should obviously be split into multiple tickets. `TOO_BROAD` does not mean "a
large amount of work". This is a semantic judgment, not a score, size
threshold, topology choice, or delivery choice.

For `TOO_BROAD`, stop before specification, architecture, decomposition,
routing, validation planning, implementation, review, and delivery. Briefly
explain why the request is too broad, then suggest its major independent chunks
as separate tickets. Do not create a working spec, task graph, worker
assignment, review handoff, or delivery artifact for the rejected request.

For `PROCEED`, continue the normal ticket lifecycle. Automatic topology
selection still happens later, and `PR` remains the normal/default delivery
path.

## Execution Topology

`/swe-forge <ticket>` uses PR delivery and automatic routing by default. The
orchestrator discovers enough repository evidence to choose the smallest useful
topology; it does not need a separate decision agent.

Harness commands may also accept an explicit topology as the first argument:

```text
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
```

Execution topology and delivery mode are orthogonal. The default delivery mode
is `PR`. Use `guided` only for the exceptional/manual checkpoint flow; `pr`
remains an explicit backwards-compatible alias for the default:

```text
/swe-forge <ticket>                 # PR delivery, automatic topology
/swe-forge guided <ticket>         # GUIDED delivery, automatic topology
/swe-forge pr <ticket>              # explicit PR alias
/swe-forge solo <ticket>            # explicit SOLO topology, PR delivery
/swe-forge subagents <ticket>      # explicit SUBAGENTS topology, PR delivery
/swe-forge solo guided <ticket>    # explicit topology and GUIDED delivery
```

The shared `.swe-forge/tools/swe-forge-invocation` primitive deterministically
parses reserved tokens, preserves raw arguments, and reports incomplete input.
Its interface is `parse --raw-arguments TEXT` or `parse --stdin`. Its one-line
JSON result contains `raw_arguments`, `parsed_ticket`, `requested_mode`,
`requested_delivery`, `delivery_mode`, `input_status`, and `consumed_tokens`.
The ticket procedure owns consuming those normalized facts and responding to
their status; automatic topology selection remains agentic. Reserved tokens
are lowercase `solo`, `subagents`, `guided`, and `pr`; other text remains ticket
content. An omitted delivery token and the explicit `pr` token both resolve to
`delivery_mode: PR`; `guided` resolves to `delivery_mode: GUIDED`.

The ticket workflow loads `.swe-forge/policies/execution-routing.md` before the
final topology decision. That policy owns the preferred/effective routing
snapshot, concise decision rationale, meaningful reassessment boundaries,
fresh semantic capability checks, and safe fallback. A run does not cache
harness-specific routing profiles or ceremonial routing history. Explicit
selections never bypass safety, validation, scope, or delivery authorization.

### SOLO

`SOLO` keeps orchestration and implementation in one context for small, tightly
coupled, sequential, or shared-surface work. It still performs discovery,
specification, proportional validation, final-diff inspection, and evidence
reporting without artificial workers.

### SUBAGENTS

`SUBAGENTS` uses demonstrated native harness subagents for independent research,
bounded delegation, or fresh review when that materially improves the result.
Independent read-only discovery may form one small logical fan-out/fan-in batch;
the host runtime decides whether its ready items execute concurrently or
sequentially. Writable delegated results are materialized into and accepted
sequentially against the single canonical delivery candidate. The root retains
task ownership, integration, verification, review, and acceptance. If the
optional native capability is unavailable, record the preferred topology and
fall back to sequential execution or `SOLO` rather than simulating workers with
unrelated processes.

## Delivery Modes

### GUIDED

`GUIDED` is the exceptional/manual mode. It keeps the user in the loop through
bounded review checkpoints. The workflow creates or reuses one safe delivery
checkout for the guided run. Before any setup or writable operation, load
`.swe-forge/policies/delivery.md`; it owns branch, checkpoint, commit, and
cleanup authorization. Guided approval never implies push, PR creation,
publication, deployment, or merge.

### PR (default)

`PR` is the default low-touch path. The normal ticket procedure loads
`.swe-forge/policies/specification.md` before clarification or specification;
`PR` additionally loads `.swe-forge/contracts/working-spec.md` before building
the transient working spec. Before writable work or delivery choices, load
`.swe-forge/policies/delivery.md`.

The transient spec owns `review_focus` and the ticket's validation decision. A
`PR` working spec is ready for implementation once its intent, scope,
acceptance, testing decision, validation plan, and review focus are clear. The
agent chooses during implementation whether the cohesive result is best
represented by one commit or several; no commit sequence is predeclared or
stored in run state. Each implementation checkpoint still binds the current
targeted evidence to a coherent materializing commit, and review
repairs use explicit additional `--review-repair` commits.

After implementation is complete, the orchestrator runs final integrated
validation once against that committed candidate and performs the initial
independent review from fresh context against the same candidate. The initial
handoff uses
the complete ticket-relevant `review_focus`, so it remains the primary
comprehensive semantic review while broader quality concerns stay relevant to
the change. If that review returns `CHANGES_REQUIRED`, it repairs only the
relevant finding, runs the affected checks, records the review-repair checkpoint
and commit, establishes the required final evidence for the repaired candidate,
and performs the focused second review against that committed `HEAD`. The
focused handoff contains only the prior blockers, repair delta, and directly
affected focus; unaffected `PASS` conclusions carry forward. A passing second
review goes directly to final acceptance; acceptance consumes current evidence
rather than rerunning unchanged validation or review. Normal review-repair
activity allows at most two review executions for the candidate, including
independent, focused, investigation, or other reviewer-like passes. The gate
records the attempts in canonical run state; a second `CHANGES_REQUIRED` result
stops automatic repair or review activity and reports the unresolved evidence.
Ordinary debugging of an unrelated implementation or test failure is separate
task recovery and does not consume this review budget. PR mode never merges;
project-facing PR content follows the delivery policy, while evidence and
receipts remain private. `/git-pr draft` requests a draft PR without changing
normal `/git-pr` behavior.

After the local gates pass, PR delivery pushes the branch, creates the one
authorized PR, records its URL and a local receipt, reports `ACCEPTED`, and
stops. Remote GitHub CI is external after PR creation: it may be reported as
pending, but SWE Forge does not await or poll it synchronously.

The working spec's `review_focus` is the sole structured review scope. The
root derives a transient focused subset after a repair instead of mutating the
original ticket or replaying unrelated criteria. The PR mental model is:
implement, use targeted validation and materialize one or more coherent
checkpoint/commit boundaries, final-validate the candidate, review, repair/validate/checkpoint/
commit when required, final-validate the changed candidate, focused re-review,
accept, push, create the PR, and report.

## Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The lifecycle
is:

1. ingest the immutable raw invocation and parsed ticket constraints;
2. perform lightweight root-owned discovery and the early semantic scope
   decision; if it is `TOO_BROAD`, explain the split and stop before downstream
   workflow machinery; for `PROCEED`, assess discovery shape, then discover
   repository evidence, quality gates, and any explicitly named optional skill;
3. specify observable acceptance criteria and, in `PR`, build the transient
   working spec;
4. architect the smallest compatible approach and identify risks;
5. decompose only where useful, loading delegation, role, and result sources
   before assigning work;
6. load routing policy before selecting `SOLO` or `SUBAGENTS`;
7. load verification before selecting validation and evidence before using the
   executable gate, fingerprints, freshness, or receipts;
8. load delivery before writable setup or delivery decisions, then implement
   bounded sequential dependency waves;
9. load failure-recovery only when its trigger occurs; host context lifecycle
   mechanics remain adapter/runtime-owned rather than canonical Forge policy;
10. verify the current candidate, review from fresh context when warranted,
    repair relevant findings, and compare the final diff with the ticket;
11. apply the canonical Acceptance Gate, perform only authorized delivery; and
12. report the result.

The workflow must adapt its depth. A typo does not require an architect,
multiple workers, or a ceremonial test plan.

## Canonical Load Map

```text
activation and lifecycle -> SWE-FORGE.md
ticket procedure -> workflows/ticket.md
early scope decision, specification and clarification -> policies/specification.md
execution routing and capability -> policies/execution-routing.md
delegation boundaries -> policies/delegation.md
verification strategy and quality gates -> policies/verification.md
evidence semantics and receipts -> policies/evidence.md
delivery and local-resource authorization -> policies/delivery.md
failure classification and recovery -> policies/failure-recovery.md
specialist-skill selection -> policies/specialist-skills.md
roles -> agents/*
contracts and data shapes -> contracts/*
harness loading -> adapters/*
```

Minimal load sets are stage-triggered. Every normal run loads this file,
`workflows/ticket.md`, the orchestrator role, and
`policies/specification.md` before specification or clarification. `PR`
additionally loads `contracts/working-spec.md`; early discovery and final
routing load `policies/execution-routing.md`; delegation loads its policy,
relevant roles, and contracts; delivery, verification, and evidence load before
their first operation. Failure recovery remains lazy.


## State and Contracts

Use the contracts under `.swe-forge/contracts/` when tasks are delegated or
state must survive an execution-context discontinuity. In `PR` mode, the
working-spec contract provides a short behavior-first brief; it is temporary
and is not a repository artifact. The run-state `continuation` section is the
authoritative workflow-control snapshot after a discontinuity; adapter reminders
and conversation summaries are not authoritative.

SWE Forge does not manage the harness context window. Host runtimes own context
preservation, compaction, retry, restoration, and related lifecycle mechanics.
SWE Forge persists authoritative workflow state and reconciles it with actual
repository and evidence state before resuming.


The canonical `swe-forge-state init` operation owns schema-v4 shell construction.
Use `set-routing` for deliberate preferred/effective topology changes,
`set-continuation` for bounded semantic continuation inputs,
`set-delivery-checkout` and `set-receipt-ref` for their purpose-specific
updates, `set-review` for review attempts, and `set-pull-request` after PR
creation. These helpers validate atomic replacements and derive
`continuation.updated_at` and the delivery projection; callers must not
hand-construct containers, timestamps, or projections in YAML.

A run state is temporary by default and should live outside the repository, for
example:

```text
$TMPDIR/swe-forge/<run-id>/run-state.yaml
```

If repository-local state is necessary, use an ignored path such as
`.swe-forge/runs/`. Never commit ticket-specific state, worker transcripts,
credentials, or generated logs. Only schema v4 is supported; obsolete state is
stale, rejected clearly, and requires a fresh run. SWE Forge does not migrate
obsolete state.

## Checkout and Delivery Safety

Before any writable setup or edit, load and follow
`.swe-forge/policies/delivery.md`. A normal run has one delivery branch and one
writable delivery checkout. Dirty, detached, protected, or ambiguous state is
preserved and reported rather than reset, cleaned, stashed, overwritten, or
delivered. Merging, publication, deployment, and other external effects remain
separately authorized.

## Failure Handling

On `BLOCKED` or `FAILED`, load and follow
`.swe-forge/policies/failure-recovery.md`; it owns retry limits, failure
classification, debugger escalation, conflict handling, and conservative
cleanup. Preserve ambiguous state and report unresolved evidence rather than
silently changing status or looping.

## Acceptance Gate

Declare success only when all applicable conditions are met:

- original acceptance criteria are accounted for;
- a testing decision is recorded and relevant behavior has automated or focused
  manual/reproduction evidence, or an evidence-backed not-applicable rationale;
- relevant tests, typecheck, lint, build, and repository checks pass;
- no blocking in-scope review finding under `.swe-forge/contracts/review.md`
  remains;
- no unintended changes remain and the final integrated diff has been
  inspected;
- any generated receipt is truthful and reports `ACCEPTED` only when its
  required evidence gate passes;
- a normal ticket has one dedicated delivery branch; and
- when `delivery_mode: PR`, any recorded implementation or review-repair
  checkpoint has targeted validation, checkpoint, and commit evidence before
  final acceptance and delivery; final validation and review evidence are
  current for the delivered candidate, or the run is reported `BLOCKED`;
  `GUIDED` may finish with a reviewed local diff when delivery actions are not
  authorized;
- after a PR is created, local receipt generation and reporting complete the
  synchronous run; remote CI is not an acceptance wait or polling phase.

Final acceptance consumes the current validation and review evidence; it does
not itself rerun unchanged semantic work or authorize another reviewer-like
pass. Do not claim a check passed when it was not run. Distinguish skipped and
unavailable checks from successful validation.

Final status is deterministic: use `ACCEPTED` only when this gate passes, use
`BLOCKED` when a user decision, authorization, access, or environment change can
enable safe continuation, and use `FAILED` when attempted work remains
incorrect or the gate cannot be met within the ticket and recovery limits.

## Final Report

Begin the final harness output with a short `Work summary` in plain human
language:

```text
Work summary:
- <what changed and what it improves>
- <material notes, when useful>
```

Return a concise report containing:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`;
- requested and selected execution topology;
- requested and selected delivery mode;
- implementation approach and important decisions;
- continuity/recovery evidence relevant to resumption;
- files changed;
- testing decision, tests, and validation performed with results;
- reviewer result and repaired findings;
- assumptions and remaining risks;
- delivery result (checkpoint, commit, push, PR URL, or explicit not-authorized
  status);
- receipt result or explicit not-generated status; and
- cleanup status and remaining temporary state when applicable.

Do not dump internal agent conversations. Report structured evidence and
 decision-relevant summaries.
