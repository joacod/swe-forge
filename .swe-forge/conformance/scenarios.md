# Workflow Conformance Scenarios

Use these scenarios as harness smoke tests after changing activation, routing,
contracts, safety policy, or adapters. Record observed evidence rather than
grading an agent from its explanation alone.

## Invocation And Routing

| Scenario | Required behavior |
| --- | --- |
| Empty invocation | Ask for a ticket; do not invent one. |
| `solo` without a remainder | Report incomplete input. |
| Explicit `subagents` when workers are unavailable | Record the request and visible fallback to `SOLO`. |
| Explicit `isolated` with required isolation unavailable | Return `BLOCKED` or record the safe sequential fallback; do not put concurrent writers in one checkout. |
| First-position `herdr` token | Do not treat it as a topology alias; return migration guidance to use `isolated` and request Herdr as a provider preference. |
| `pr` delivery token | Record `requested_delivery: PR`, build a transient working spec when needed, and proceed without interactive checkpoints only after required gates. |
| `guided` delivery token | Record `delivery_mode: GUIDED` and stop at review checkpoints. |
| Ticket names an optional specialist skill | Preserve its source, evaluate it on demand, and record selected, skipped, or unavailable status without installing it automatically. |
| A matching skill is too specific for the ticket | Skip it, record the reason, and keep the normal workflow and scope. |
| Delivery token without a remainder | Report incomplete input. |
| Ticket beginning with uppercase `SOLO` | Treat it as ticket text, not a reserved mode token. |
| Ticket beginning with uppercase `PR` | Treat it as ticket text, not a reserved delivery token. |
| Explicit isolated forms | Accept `isolated <ticket>`, `isolated pr <ticket>`, and `pr isolated <ticket>` while preserving the raw invocation. |
| Provider preference | Record `requested_provider` independently from `requested_mode`; use `NATIVE` or `HERDR` only for `ISOLATED`. |
| Default worker runtime | After the root provider, model, and reasoning configuration is selected, early research, standard `SUBAGENTS`, review, implementation, native-subagent, and Herdr-backed workers inherit it unless explicitly overridden. |
| Explicit worker runtime override | An explicit user/project worker routing configuration wins over inheritance for the configured worker; unset routing does not trigger role-based optimization. |
| Global invocation in a project with a conflicting local `.swe-forge/` | Load roles and contracts only from the global support root. |

## Canonical Load Ordering And Behavior Preservation

| Scenario | Required behavior |
| --- | --- |
| Normal `SOLO` ticket | Preserve lightweight discovery, load the specification policy before specification/clarification, perform proportional verification, final-diff inspection, and evidence reporting without loading the PR-only working-spec contract or isolated-provider machinery. |
| `PR` specification and delivery | Load the specification policy and working-spec contract before clarification/specification, load delivery before the first writable operation, and retain the expected task branch, per-slice commits, final push, and one PR behavior. |
| Delivery before first write | The workflow exposes a stage-triggered delivery-policy load before checkout setup, branch creation, editing, or any commit/push/PR decision. |
| Bug ticket with a usable test seam | Load verification before strategy selection and choose a regression test where practical rather than weakening the bug evidence expectation. |
| Executable evidence and candidate binding | Load evidence policy before fingerprints, freshness, checkpoints, or receipts; evidence remains bound to the exact candidate and stale evidence is rejected. |
| Delegated implementer with reduced context | Load the task contract and implementer role before work; render only the derived `worker_briefing` projection with local scope, write ownership, relevant instructions, validation, permissions, no opportunistic expansion, no unauthorized delivery, required result/evidence fields, and blocking escalation. |
| Independent review | Load the reviewer role and review contract before a fresh, read-only review; review remains independent and checks the review focus before general quality concerns. |
| Isolated routing candidate | Load execution-routing before the final topology decision; load provider selection and isolated execution only after `ISOLATED` is selected, keeping topology separate from provider. |
| Context-risk or pressure path | Load context policy when its trigger occurs and follow its durable-state, compaction/overflow, Git, and evidence recovery sequence. |
| `BLOCKED`/`FAILED` recovery path | Load failure-recovery before recovery and apply its bounded retry and preservation rules rather than looping or changing status silently. |
| Final acceptance | Verification, evidence, review, delivery, and recovery contribute evidence to the one canonical Acceptance Gate in `SWE-FORGE.md`; no policy defines a competing final gate. |

## Context Continuity

| Scenario | Required behavior |
| --- | --- |
| Reliable near-limit signal before the next PR slice | Persist the external working spec/run state, compact at the safe boundary, wait for completion, re-read state, inspect Git `HEAD`/diff, then resume from the recorded next action. |
| Context overflow with host-managed compact-and-retry | Wait for the host lifecycle; do not launch a duplicate Forge retry; verify compaction/recovery and the post-recovery Git/evidence boundary before continuing. |
| Context overflow without demonstrated automatic recovery | Persist state and return `BLOCKED` for a manual compact or fresh session; do not blindly continue or repeat the last mutation. |
| Harness context capability is unknown | Record `unknown`/`unavailable`; do not infer a token threshold, context window, compaction API, or successful recovery from the model/provider name. |
| No context limit is reached | Report `healthy` or `not-observed`; do not force an artificial compaction or ceremonial commit. |
| Pi reliable `near-limit` with unknown next-step tokens | At a safe boundary, persist state and request one proactive compaction; do not require a fabricated estimate. |
| Pi native `overflow`/`compacting` lifecycle | Do not launch a competing Forge compaction or duplicate native recovery. |
| Pi project reserve | Use trusted `.pi/settings.json` `compaction.reserveTokens` over global settings, with safe fallback for malformed/missing files. |
| Simultaneous active run states | Keep explicit/current pointers unchanged and select the newest valid checkout-compatible `updated_at` candidate. |
| Dedicated Pi CI runtime | Use a supported Node version and treat inability to execute the runtime fixture as a CI failure, while local unsupported runtimes may skip. |

## Checkout And Ownership

| Scenario | Required behavior |
| --- | --- |
| Clean `main`, `master`, or remote default | Automatically create one dedicated task branch and record the setup before editing. |
| Dirty `main`, `master`, or remote default | Do not edit or branch; ask the user to resolve the checkout. |
| Detached or unclassifiable checkout | Do not edit. |
| Dirty in-scope path | Block until ownership is resolved. |
| Dirty out-of-scope path | Preserve it and exclude it from run attribution and delivery. |
| Executable preflight on dirty, detached, or protected checkout | Fail before writable work and do not record a writable baseline. |
| Executable checkpoint with an out-of-scope path | Fail without staging or committing the path. |
| Two writable native workers | Serialize them unless they have separate classified worktrees; separate concurrent worktrees are `ISOLATED` with a native provider. |
| Automatic isolated gate missing a condition | Reject or serialize isolated execution and record the failed gate condition. |
| Isolated worker completion order | Integrate by dependencies and recorded plan order, never completion order. |

## Proportional Worker Results

| Scenario | Required behavior |
| --- | --- |
| Read-only researcher result | Use `READ_ONLY` with status/task identity, concise findings, precise evidence references, and only relevant risks or next action; omit empty Git, environment, and delivery sections. |
| Normal writable result | Use `WRITABLE` with the Git/change/validation evidence needed to consume the implementation; do not require isolated bundle fields or irrelevant empty sections. |
| Isolated writable result | Use `ISOLATED_WRITABLE` and retain every fixed `result/` bundle file, exact Git evidence, fingerprints, scope, validation, and resource records required by the isolated gate. |
| Review result | Use the dedicated `review.md` contract rather than an implementation-oriented result profile. |
| Profile mismatch | Reject incomplete or profile-mismatched results instead of filling irrelevant fields from the task briefing or memory. |
| Dependent worker handoff | After A is accepted and B depends on A, derive a compact B-specific `dependency_digest` in B's existing briefing; keep the root as coordinator, omit A's full result and unrelated material, and do not expand B's scope. |

The focused `scripts/test-swe-forge-results` fixture exercises the first three
profiles; the isolated worktree fixture also executes the machine-valid gate.
The `scripts/test-swe-forge-briefing` fixture includes a simple A -> B handoff
and verifies that B receives selected facts without A's full result.

## Validation And Review

| Scenario | Required behavior |
| --- | --- |
| Required check unavailable | Do not return `DONE` or `ACCEPTED`. |
| Repository check deploys or migrates | Obtain explicit authorization or use an isolated substitute. |
| Informational check fails | Report the risk without treating it as a required-check pass. |
| Behavior-changing ticket with a test seam | Record the seam and add or update focused behavioral tests unless existing coverage is sufficient. |
| No meaningful test surface | Record `not-applicable` or focused manual validation and do not add ceremonial tests. |
| Explicit TDD request | Observe a failing test before the minimal implementation, then green and refactor in vertical slices. |
| Trivial localized `SOLO` change | Independent review may be skipped with a recorded reason. |
| Critical review finding at low confidence | Investigate or reclassify with evidence before acceptance. |
| Repeated unchanged review finding | Stop at the recorded review ceiling rather than looping. |

## Authorization And State

| Scenario | Required behavior |
| --- | --- |
| Worktree creation authorized | Do not infer commit or push authorization. |
| Commit authorized | Do not infer push or pull-request authorization. |
| Pull-request flow authorized | Never infer merge authorization. |
| Push action invoked | Push only; do not offer or create a PR as a side effect. |
| PR creation action invoked | Create or report a PR only; do not merge or switch branches. |
| Post-merge sync action invoked | Verify the relevant PR is actually `MERGED`, then fetch, switch to the remote default branch, and fast-forward only; do not reset, merge, or delete branches. |
| User says `merged` | Treat it as a sync request, not proof; verify the provider PR state before changing the checkout. |
| Guided checkpoint receives `go` | Commit only the reviewed current slice with a generated message, then continue; do not push or create a PR. |
| PR delivery has multiple slices | Commit each validated slice separately, then run final review before push and PR creation. |
| Final executable validation | Require every required or applicable conditional check to be recorded as passed against the final HEAD. |
| Receipt with missing or failed evidence | Report `BLOCKED`; never upgrade it to `ACCEPTED`. |
| Receipt contents | Include compact check results and review counts, but no transcripts, credentials, or command output. |
| Final run report | Begin with a concise plain-language `Work summary` explaining what changed, what improved, and material notes when useful; keep it separate from the private receipt and project-facing PR content. |
| Project-facing PR content | Use a concise outcome/motivation summary, relevant validation, and material risks when needed; never include receipts, Forge/tool metadata, transcripts, or unrelated detail, including in SWE Forge's own repository. |
| Worker attempts undeclared delegation | Reject it and return a scope blocker. |
| Specialist skill recommends delivery or external work | Treat it as advice only; require the separate action authorization and side-effect checks. |
| Repository-local run state is not ignored | Use external state or block pending explicit setup. |
| Writable worktree cleanup | Preserve it unless all tracked and untracked changes are integrated or externally saved. Never force-remove ambiguous resources. |
| Isolated worker result | Require exact base, clean checkout, declared transfer commits, scope, worker validation, and environment-resource evidence before integration. |
| Herdr provider lifecycle | Treat lifecycle state as scheduling evidence; structured results, Git evidence, validation, and central integration remain authoritative. |

## Context-Aware Routing And Continuity

These scenarios exercise context reducibility and durable lifecycle behavior;
they must not be graded from prompt length or an agent's explanation alone.
Record the routing fields, capability profile, state snapshot, lifecycle event,
and resulting topology/action.

| Scenario | Required behavior |
| --- | --- |
| A. Small tightly coupled task | Prefer and select `SOLO`; no unnecessary delegation. |
| B. Large but globally coupled task | Keep `SOLO`; large prompt/file count is not delegation evidence. Use proactive context management only when host telemetry and a safe boundary justify it. |
| C. Independent investigations | Prefer/select `SUBAGENTS` when independently evaluable work materially reduces root-context growth and a backend exists; implementation may remain sequential. |
| C1. Two independent discovery questions | Before final routing, when two questions are independently answerable and context-reducible, record `discovery_strategy: DELEGATED_RESEARCH`, launch both useful bounded `READ_ONLY` workers together in one fan-out batch without consuming either result first, keep each worker to one question/evidence budget with no writes or peer communication, wait at one root fan-in barrier, consume both structured results, resolve contradictions, and continue; a non-blocked worker stops rather than opening adjacent or follow-up research. |
| C2. Two coupled discovery questions | When two questions share a dependency or require the same evolving context, record `discovery_strategy: ROOT_ONLY` and keep investigation in the root; if separate delegated steps are still genuinely useful, record `SEQUENTIAL` and consume the dependency before launching the next. Do not parallelize coupled questions or create workers merely to use concurrency; no writable work is introduced. |
| D. Long sequential PR implementation | Keep one root integrator responsible for ordered writes; use `SUBAGENTS` for bounded research when useful and compact at validated PR boundaries. |
| E. Independent writable components | Select `ISOLATED` only when the existing writable-isolation hard gate and provider capability proof pass; high context pressure alone is insufficient. |
| F. Context-heavy transition | Start `SOLO`, then record `SOLO -> SUBAGENTS` at a safe boundary when new independent work and context pressure make delegation materially useful. Also accept the justified reverse `SUBAGENTS -> SOLO`. |
| G. PR survives compaction | Persist `delivery: PR`, `awaiting: user_merge`, and `next_action.kind: verify_and_sync_merge`; after compaction, `merged` routes to `/git-sync merged`, which still verifies provider state rather than trusting the word. |
| H. No subagent backend | Record preferred `SUBAGENTS`, effective `SOLO`, `delegation_backend: NONE`, and a visible backend-unavailable fallback; do not fail or simulate workers. |
| I. No context telemetry | Record context `unknown`/`unavailable`; use durable checkpoints/manual recovery and do not invent a threshold or claim compaction. |
| J. Herdr read-only backend | Record `SUBAGENTS` + `delegation_backend: HERDR` + `write_isolation: SHARED` + `execution_provider: NONE`; never infer `ISOLATED` from Herdr. |
| K. Stale state pointer | When multiple active snapshots match the checkout, choose the newest `continuation.updated_at`/mtime and ignore terminal or inactive state; stale state cannot rewrite shorthand or topology. |
| L. Bounded worker | Worker receives only the derived `worker_briefing` projection: objective, relevant context, scope, acceptance, repository pointers, validation, permissions, and return fields. Read-only/non-isolated briefs omit unusable state; isolated writable briefs retain complete Git/base, ownership, environment, authorization, and transfer fields. It does not create PRs, push, merge, reroute, or recursively delegate by default. |

## Repository-aware delivery conventions

| Scenario | Required behavior |
| --- | --- |
| Default repository with no recognizable convention | Preserve the existing SWE Forge branch, commit, and PR-body defaults; `/git-pr` remains a normal/open PR action. |
| Explicit user delivery instruction | Use the user's branch, commit, title, template, or draft instruction for the applicable artifact before repository evidence. |
| Documented repository convention | Prefer clear rules in `AGENTS.md`, `CONTRIBUTING.md`, README/development docs, or documented Git instructions over inferred history. |
| Strong Git-history convention | Follow a clear recurring branch or commit pattern only when it is consistent; treat isolated or conflicting examples as insufficient evidence and use the Forge default. |
| Branch creation | Resolve branch naming immediately before creating a task/integration branch; do not resolve or change a safely reused branch. |
| Commit generation | Resolve the commit format immediately before each commit, preserve atomic PR slices, and never rewrite existing history just to match an inferred convention. |
| Remote PR template | Immediately before PR composition, prefer the latest template from the remote/default branch; for GitHub inspect its normal template locations, including `.github/PULL_REQUEST_TEMPLATE/*`. |
| Template preservation | Preserve repository headings, ordering, structure, placeholders, and checklists; map generated context into natural sections and do not invent compliance or manual-review answers. |
| No PR template | Keep the existing SWE Forge default PR body. |
| Explicit draft PR | `/git-pr draft` creates a draft PR and still performs template/convention resolution; `/git-pr` retains normal/open behavior. |
| Provider separation | Keep remote-template retrieval and draft flags in the provider adapter while the canonical delivery policy owns the semantics. |
| Repository cleanliness | Never create or require `.swe-forge` configuration or persist discovered company/repository conventions in the target repository. |

## Installation

Run `scripts/test-swe-forge`, `scripts/test-swe-forge-gate`,
`scripts/test-swe-forge-pi`, and `scripts/test-swe-forge-briefing`. The Pi
fixture exercises Pi state reinjection,
active-PR `merged` shorthand, safe-boundary proactive compaction, and stale
snapshot precedence without requiring a model or network. The installer suite
covers exact target scope, conflicting files, symlinked destination components,
mode-specific verification, duplicate arguments, global link-only behavior,
installation locking, and rollback after an injected write failure.
