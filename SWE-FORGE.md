# SWE Forge Specification

SWE Forge is an explicitly invoked, harness-agnostic software-engineering
workflow for AI coding harnesses. It takes one coding ticket through inspection,
planning, implementation, verification, review, and delivery. A run owns one
writable delivery checkout and one reviewable delivery outcome. Harness-native
subagents may assist with bounded work, but concurrent writable-agent
orchestration, worker fleets, external orchestration, and multi-workspace
integration are outside SWE Forge's scope.

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
  and context headroom;
- prefer a strong single agent over pointless delegation; prompt length alone
  never selects a topology;
- delegate only independently evaluable work whose concise result materially
  reduces root context growth;
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
- derive compact root-accepted `dependency_digest` facts for sequential
  dependent work; never open peer channels or forward a transcript;
- consume structured worker results rather than conversational memory;
- keep read-only research separate from writable implementation;
- never allow concurrent writers to edit the delivery checkout;
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

## Execution Topology

`/swe-forge <ticket>` uses automatic routing by default. The orchestrator
discovers enough repository evidence to choose the smallest useful topology; it
does not need a separate decision agent.

Harness commands may also accept an explicit topology as the first argument:

```text
/swe-forge solo <ticket>
/swe-forge subagents <ticket>
```

Execution topology and delivery mode are orthogonal. The default delivery mode
is `GUIDED`; use `pr` only when the user wants the run to continue through
pull-request creation:

```text
/swe-forge <ticket>                 # GUIDED, automatic topology
/swe-forge pr <ticket>              # PR delivery, automatic topology
/swe-forge solo pr <ticket>         # explicit topology plus PR delivery
/swe-forge subagents <ticket>       # explicit bounded native delegation
```

The shared `.swe-forge/tools/swe-forge-invocation` primitive deterministically
parses reserved tokens, preserves raw arguments, and reports incomplete input.
Its interface is `parse --raw-arguments TEXT` or `parse --stdin`. Its one-line
JSON result contains `raw_arguments`, `parsed_ticket`, `requested_mode`,
`requested_delivery`, `delivery_mode`, `input_status`, and `consumed_tokens`.
The ticket procedure owns consuming those normalized facts and responding to
their status; automatic topology selection remains agentic. Reserved tokens
are lowercase `solo`, `subagents`, `guided`, and `pr`; other text remains ticket
content.

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
Independent read-only discovery may use one bounded fan-out/fan-in batch.
Writable delegated work is sequential in the single delivery checkout. The root
retains task ownership, integration, verification, review, and acceptance. If
the optional native capability is unavailable, record the preferred topology
and fall back to sequential execution or `SOLO` rather than simulating workers
with unrelated processes.

## Delivery Modes

### GUIDED (default)

`GUIDED` keeps the user in the loop through bounded review checkpoints. The
workflow creates or reuses one safe delivery checkout for normal execution.
Before any setup or writable operation, load `.swe-forge/policies/delivery.md`;
it owns branch, checkpoint, commit, and cleanup authorization. Guided approval
never implies push, PR creation, publication, deployment, or merge.

### PR

`PR` is the opt-in low-touch path. The normal ticket procedure loads
`.swe-forge/policies/specification.md` before clarification or specification;
`PR` additionally loads `.swe-forge/contracts/working-spec.md` before building
the transient working spec. Before writable work or delivery choices, load
`.swe-forge/policies/delivery.md`.

The transient spec owns an ordered commit plan and `review_focus`; the
orchestrator validates and commits each cohesive step before starting the next.
It then runs final verification and independent review before one authorized
push and one final PR on the single delivery branch. PR mode never merges;
project-facing PR content follows the delivery policy, while evidence and
receipts remain private. `/git-pr draft` requests a draft PR without changing
normal `/git-pr` behavior.

The atomic `git-commit`, `git-push`, `git-pr`, and `git-sync` actions load and
follow `.swe-forge/policies/delivery.md` separately. Pushing never creates a PR
as a side effect, and post-merge sync verifies the PR state first.

## Ticket Lifecycle

Follow the detailed procedure in `.swe-forge/workflows/ticket.md`. The lifecycle
is:

1. ingest the immutable raw invocation and parsed ticket constraints;
2. assess discovery shape, then discover repository evidence, quality gates, and
   any explicitly named optional skill;
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
9. load context or failure-recovery policy only when their triggers occur;
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
specification and clarification -> policies/specification.md
execution routing and capability -> policies/execution-routing.md
delegation boundaries -> policies/delegation.md
verification strategy and quality gates -> policies/verification.md
evidence semantics and receipts -> policies/evidence.md
delivery and local-resource authorization -> policies/delivery.md
context continuity and compaction -> policies/context.md
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
their first operation. Context and failure recovery remain lazy.

## State and Contracts

Use the contracts under `.swe-forge/contracts/` when tasks are delegated or
state must survive context changes. In `PR` mode, the working-spec contract
provides a short behavior-first brief; it is temporary and is not a repository
artifact. The run-state `continuation` section is the authoritative workflow
control snapshot after compaction; adapter reminders and conversation summaries
are not authoritative.

The canonical `swe-forge-state init` operation owns schema-v4 shell construction.
Use `set-routing` for deliberate preferred/effective topology changes,
`set-continuation` for bounded semantic continuation inputs, and
`set-delivery-checkout` and `set-receipt-ref` for their purpose-specific
updates. These helpers validate atomic replacements and derive
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
- when `delivery_mode: PR`, authorized commit, push, and pull-request actions
  complete or the run is reported `BLOCKED`; `GUIDED` may finish with a
  reviewed local diff when delivery actions are not authorized.

Do not claim a check passed when it was not run. Distinguish skipped and
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
- context capability/status and any compaction or recovery evidence;
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
