# Workflow Conformance Scenarios

Use these scenarios as harness smoke tests after changing activation, routing,
contracts, safety policy, or adapters. Record observed evidence rather than
grading an agent from its explanation alone.

## Invocation and Routing

| Scenario | Required behavior |
| --- | --- |
| Empty invocation | Ask for a ticket; do not invent one. |
| `solo` without a remainder | Report incomplete input. |
| Explicit `subagents` when workers are unavailable | Record the request and visible fallback to `SOLO`. |
| Native capability unavailable during automatic routing | Keep the preferred decision visible and execute sequentially or in `SOLO`. |
| First-position unknown token | Treat it as ticket text, not a reserved command. |
| `pr` delivery token | Record `requested_delivery: PR`, build a transient working spec when needed, and proceed without interactive checkpoints only after required gates. |
| `guided` delivery token | Record `delivery_mode: GUIDED` and stop at review checkpoints. |
| Ticket names an optional specialist skill | Preserve its source, evaluate it on demand, and record selected, skipped, or unavailable status without installing it automatically. |
| Delivery token without a remainder | Report incomplete input. |
| Ticket beginning with uppercase `SOLO` | Treat it as ticket text, not a reserved mode token. |
| Ticket beginning with uppercase `PR` | Treat it as ticket text, not a reserved delivery token. |
| Explicit topology and delivery forms | Accept `solo <ticket>`, `subagents <ticket>`, `pr solo <ticket>`, and `solo pr <ticket>` while preserving the raw invocation. |
| Global invocation in a project with a conflicting local `.swe-forge/` | Load roles and contracts only from the global support root. |

## Run-State Ownership and Current Schema

| Scenario | Required behavior |
| --- | --- |
| Valid current schema v4 state | Validate successfully with only `routing.preferred` and `routing.current` as durable topology fields. |
| Schema v3 state | Reject clearly as stale/unsupported; require a fresh run. |
| Unknown/future schema version | Reject clearly as stale/unsupported; do not migrate or normalize it. |
| Current state missing a required routing fact | Reject deterministically. |
| Current state with preferred/effective divergence | Permit `routing.preferred: SUBAGENTS` with `routing.current: SOLO` after safe fallback. |
| Current state with removed routing fields | Reject deterministically as obsolete; never migrate schema-v4 snapshots. |
| Malformed current routing | Reject deterministically rather than guessing a topology. |
| Matching delivery recovery projection | Validate successfully when `continuation.delivery.mode` equals `delivery_mode`. |
| Contradictory delivery recovery projection | Reject deterministically. |
| Pi loads stale or malformed active state | Ignore the snapshot rather than interpreting removed fields or falling back to an obsolete representation. |

## Canonical Load Ordering and Behavior Preservation

| Scenario | Required behavior |
| --- | --- |
| Normal `SOLO` ticket | Preserve lightweight discovery, load the specification policy before specification/clarification, perform proportional verification, final-diff inspection, and evidence reporting. |
| `PR` specification and delivery | Load the specification policy and working-spec contract before clarification/specification, load delivery before the first writable operation, and retain task-branch, per-slice commit, final push, and one PR behavior. |
| Delivery before first write | Expose a stage-triggered delivery-policy load before checkout setup, branch creation, editing, or any commit/push/PR decision. |
| Bug ticket with a usable test seam | Load verification before strategy selection and choose a regression test where practical. |
| Executable evidence and candidate binding | Load evidence policy before fingerprints, freshness, checkpoints, or receipts; evidence remains bound to the exact candidate and stale evidence is rejected. |
| Delegated implementer with reduced context | Load the task contract and implementer role; invoke the canonical worker-brief renderer and pass only its validated projection with local scope, write ownership, relevant instructions, validation, permissions, no opportunistic expansion, no unauthorized delivery, required result/evidence fields, and blocking escalation. |
| Independent review | Load the reviewer role and review contract before a fresh, read-only review; review remains independent and checks the review focus before general quality concerns. |
| Context discontinuity or recovery path | Re-read authoritative run state and inspect actual Git/evidence state before continuing; do not trust a conversational summary or repeat completed semantic work. |
| `BLOCKED`/`FAILED` recovery path | Load failure-recovery before recovery and apply its bounded retry and preservation rules rather than looping or changing status silently. |
| Final acceptance | Verification, evidence, review, delivery, and recovery contribute evidence to the one canonical Acceptance Gate in `SWE-FORGE.md`; no policy defines a competing final gate. |

## Continuity Across Host Lifecycle Events

| Scenario | Required behavior |
| --- | --- |
| Host context discontinuity after a safe workflow boundary | Persist authoritative continuation state, wait for the host lifecycle to settle, re-read state, inspect Git `HEAD`/diff and evidence, then resume from the recorded next action. |
| Host-managed retry or recovery | Keep host retry state distinct from SWE Forge task retries; inspect the post-recovery checkout and evidence before continuing, with no duplicate semantic action. |
| Host lifecycle integration unavailable | Continue only from durable workflow state and actual repository/evidence reconciliation; do not infer host preservation or recovery behavior. |
| Simultaneous active run states | Keep explicit/current pointers unchanged and select the newest valid checkout-compatible `updated_at` candidate. |
| Dedicated Pi CI runtime | Use a supported Node version and treat inability to execute the runtime fixture as a CI failure, while local unsupported runtimes may skip. |

## Checkout and Ownership

| Scenario | Required behavior |
| --- | --- |
| Clean `main`, `master`, or remote default | Automatically create one dedicated task branch and record setup before editing. |
| Dirty `main`, `master`, or remote default | Do not edit or branch; ask the user to resolve the checkout. |
| Detached or unclassifiable checkout | Do not edit. |
| Dirty in-scope path | Block until ownership is resolved. |
| Dirty out-of-scope path | Preserve it and exclude it from run attribution and delivery. |
| Executable preflight on dirty, detached, or protected checkout | Fail before writable work and do not record a writable baseline. |
| Executable checkpoint with an out-of-scope path | Fail without staging or committing the path. |
| Two writable native workers | Canonical materialization and acceptance are sequential; concurrent mutation of the delivery candidate is forbidden. |
| Native read-only fan-out | Form only genuinely independent questions together; let the host schedule them and fan in once at the root. |
| Host-private worker execution | Keep private worktrees, sandboxes, overlays, containers, and equivalent mechanisms out of Forge state; materialize and validate the bounded result in the canonical delivery checkout before acceptance. |

## Proportional Worker Results

| Scenario | Required behavior |
| --- | --- |
| Read-only researcher result | Use `READ_ONLY` with status/task identity, concise findings, precise evidence references, and only relevant risks or next action; omit empty Git and delivery sections. |
| Normal writable result | Use `WRITABLE` with canonical delivery identity/fingerprint, changed-path, Git, and validation evidence; do not require a worker cwd or physical execution path. |
| Review result | Use the dedicated `review.md` contract rather than an implementation-oriented result profile. |
| Profile mismatch | Reject incomplete or profile-mismatched results instead of filling irrelevant fields from the briefing or memory. |
| Dependent worker handoff | After A is accepted and B depends on A, derive a compact B-specific `dependency_digest` in B's existing briefing; keep the root as coordinator, omit A's full result and unrelated material, and do not expand B's scope. |

The focused `scripts/test-swe-forge-results` fixture exercises the ordinary
profiles. The `scripts/test-swe-forge-briefing` fixture includes an A -> B
handoff and verifies that B receives selected facts without A's full result.

## Validation and Review

| Scenario | Required behavior |
| --- | --- |
| Required check unavailable | Do not return `DONE` or `ACCEPTED`. |
| Repository check deploys or migrates | Obtain explicit authorization or stop before the effect. |
| Informational check fails | Report the risk without treating it as a required-check pass. |
| Behavior-changing ticket with a test seam | Record the seam and add or update focused behavioral tests unless existing coverage is sufficient. |
| No meaningful test surface | Record `not-applicable` or focused manual validation and do not add ceremonial tests. |
| Explicit TDD request | Observe a failing test before the minimal implementation, then green and refactor in vertical slices. |
| Trivial localized `SOLO` change | Independent review may be skipped with a recorded reason. |
| Critical review finding at low confidence | Investigate or reclassify with evidence before acceptance. |
| Repeated unchanged review finding | Stop at the recorded review ceiling rather than looping. |
| Review attempt 1 and 2 both require changes | Record attempts 1 and 2 in canonical state, preserve the second findings, and reject a third reviewer-like execution without replacing evidence. |
| Successful focused second review | After an initial repair, record attempt 2 as `PASS` and allow acceptance when all other gates pass. |
| Reviewer-like recovery alias | An investigation, debug review, or focused-review source still consumes the shared review budget; ordinary unrelated test debugging does not. |
| PR commit plan with multiple steps | Require each ordered step to have its own validated checkpoint and materializing commit; reject one catch-all checkpoint. |
| PR commit plan with one step | Allow one cohesive implementation step and one commit without ceremonial extra commits. |
| Review-repair delivery commit | Record a repair checkpoint/commit separately; it does not complete or replace a planned implementation step. |
| PR creation completion boundary | After local gates pass and the PR URL is recorded, report completion without awaiting or polling remote GitHub CI. |

## Authorization and State

| Scenario | Required behavior |
| --- | --- |
| Branch creation authorized | Do not infer commit or push authorization. |
| Commit authorized | Do not infer push or pull-request authorization. |
| Pull-request flow authorized | Never infer merge authorization. |
| Push action invoked | Push only; do not offer or create a PR as a side effect. |
| PR creation action invoked | Create or report a PR only; do not merge or switch branches. |
| Post-merge sync action invoked | Verify the relevant PR is actually `MERGED`, then fetch, switch to the remote default branch, and fast-forward only. |
| User says `merged` | Treat it as a sync request, not proof; verify the PR state before changing the checkout. |
| Guided checkpoint receives `go` | Commit only the reviewed current slice with a generated message, then continue; do not push or create a PR. |
| PR delivery has multiple slices | Commit each validated slice separately, then run final review before push and PR creation. |
| Final executable validation | Require every required or applicable conditional check to be recorded as passed against the final `HEAD`. |
| Receipt with missing or failed evidence | Report `BLOCKED`; never upgrade it to `ACCEPTED`. |
| Receipt contents | Include compact check results and review counts, but no transcripts, credentials, or command output. |
| Final run report | Begin with a concise plain-language `Work summary`; keep it separate from the private receipt and project-facing PR content. |
| Project-facing PR content | Use a concise outcome/motivation summary, relevant validation, and material risks when needed; never include receipts, Forge/tool metadata, transcripts, or unrelated detail. |
| Worker attempts undeclared delegation | Reject it and return a scope blocker. |
| Specialist skill recommends delivery or external work | Treat it as advice only; require separate action authorization and side-effect checks. |
| Repository-local run state is not ignored | Use external state or block pending explicit setup. |
| Temporary-state cleanup | Preserve dirty, blocked, stale, conflicting, or ambiguous state; never force-remove it. |

## Routing and Continuity

| Scenario | Required behavior |
| --- | --- |
| Small tightly coupled task | Prefer and select `SOLO`; no unnecessary delegation. |
| Large but globally coupled task | Keep `SOLO`; large prompt/file count is not delegation evidence. |
| Independent investigations | Prefer/select `SUBAGENTS` when independently evaluable work materially reduces root coordination and a native capability exists; implementation may remain sequential. |
| Two independent discovery questions | Record `DELEGATED_RESEARCH`, launch both bounded read-only workers together before consuming results, wait at one root fan-in barrier, resolve contradictions, and continue. |
| Two coupled discovery questions | Record `ROOT_ONLY` or a real sequential dependency; do not parallelize coupled questions. |
| Long sequential PR implementation | Keep one root owner responsible for ordered writes; use bounded `SUBAGENTS` research when useful and preserve durable continuation at workflow boundaries. |
| Host lifecycle transition | Re-read durable state and actual Git/evidence state before changing topology or resuming semantic work; do not route from a host signal alone. |
| PR survives a context discontinuity | Persist `delivery: PR`, `awaiting: user_merge`, and `next_action.kind: verify_and_sync_merge`; after recovery, `merged` routes to `/git-sync merged` after verification. |
| No native subagent capability | Record preferred `SUBAGENTS`, effective `SOLO`, and a visible capability-unavailable fallback; do not fail or simulate workers. |
| Bounded worker | Worker receives only the canonical renderer's `worker_briefing` projection: objective, relevant context, scope, acceptance, repository pointers, validation, permissions, and return fields. It does not create PRs, push, merge, reroute, or recursively delegate by default. |

## Repository-aware Delivery Conventions

| Scenario | Required behavior |
| --- | --- |
| Default repository with no recognizable convention | Preserve existing SWE Forge branch, commit, and PR-body defaults; `/git-pr` remains a normal/open PR action. |
| Explicit user delivery instruction | Use the user's branch, commit, title, template, or draft instruction for the applicable artifact before repository evidence. |
| Documented repository convention | Prefer clear rules in `AGENTS.md`, `CONTRIBUTING.md`, README/development docs, or documented Git instructions over inferred history. |
| Strong Git-history convention | Follow a clear recurring branch or commit pattern only when it is consistent. |
| Branch creation | Resolve branch naming immediately before creating a task branch; do not resolve or change a safely reused branch. |
| Commit generation | Resolve commit format immediately before each commit and preserve atomic PR slice boundaries. |
| Remote PR template | Immediately before PR composition, prefer the latest template from the remote/default branch. |
| Template preservation | Preserve repository headings, ordering, structure, placeholders, and checklists. |
| No PR template | Keep the existing SWE Forge default PR body. |
| Explicit draft PR | `/git-pr draft` creates a draft PR and `/git-pr` retains normal/open behavior. |
| Repository cleanliness | Never create or require `.swe-forge` configuration or persist discovered repository conventions in the target repository. |

## Installation

Run `scripts/test-swe-forge`, `scripts/test-swe-forge-gate`,
`scripts/test-swe-forge-pi`, and `scripts/test-swe-forge-briefing`. The Pi
fixture exercises state reinjection, active-PR `merged` shorthand, host
lifecycle continuation refresh, and stale snapshot precedence without requiring
a model or network. The installer suite covers exact target scope, conflicting
symlinked destination components, user-level link-only behavior, installation
locking, and rollback after an injected write failure.
