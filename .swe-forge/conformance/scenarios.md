# Workflow Conformance Scenarios

Use this matrix as a smoke-test index after changing activation, routing,
contracts, safety policy, or adapters. The owner files define the behavior; a
scenario records the observable outcome rather than repeating its procedure.

## Invocation and scope

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Empty or incomplete invocation | Ask for the missing ticket; do not invent one. | invocation tool |
| Default delivery | `delivery_mode: PR` with automatic topology. | invocation/spec |
| Delivery modifiers | A leading lowercase `guided` selects `GUIDED`; topology words remain ticket text and uppercase tokens remain ticket text. | invocation tool |
| Small or substantial cohesive ticket | Decide `PROCEED`; size, prompt length, file count, and ordered steps do not reject it. | specification |
| Independent or open-ended bundle | Decide `TOO_BROAD`, suggest chunks, and stop before downstream workflow. | specification |
| Optional skill named | Preserve and evaluate its source; never install automatically. | specialist-skills |

## State and load order

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Current run state | Schema v5 validates the compact run fence, route, canonical checkout, continuation, candidate-bound validation/review, and delivery facts. | run-state |
| Old, future, malformed, or obsolete state | Reject clearly; never migrate, normalize, or guess. | run-state |
| Preferred/effective divergence | Permit preferred `SUBAGENTS` with effective `SOLO` after safe fallback. | routing/run-state |
| Duplicate workflow projections | Do not persist requested modes, receipt/checkpoint/fingerprint state, or a copied delivery-mode continuation projection. | run-state |
| Active-state selection | Ignore stale, terminal, wrong-checkout, or obsolete candidates; choose the newest valid candidate. | state tool |
| Normal ticket load | Load specification before clarification, routing before final topology, verification before checks, delivery before the first write, and recovery only on trigger. | workflow |
| PR specification | Load `contracts/working-spec.md` before building the transient spec. | workflow |
| Evidence features | Load evidence policy before recording executable validation or relying on Git candidate identity. | workflow |

## Continuity, checkout, and ownership

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Context discontinuity or recovery | Re-read authoritative state and inspect actual Git/evidence before resuming; do not repeat completed semantic work. | state/workflow |
| Host retry | Keep host retry separate from Forge retry and inspect post-retry state. | failure-recovery |
| Clean protected default | Create one dedicated branch and record setup before editing. | delivery |
| Dirty, detached, protected, or ambiguous checkout | Do not edit, reset, stash, clean, overwrite, or deliver; preserve and report it. | delivery |
| Dirty out-of-scope path | Preserve it and exclude it from run attribution and delivery. | delivery |
| Two writable workers | Materialize and accept results sequentially in one canonical delivery checkout. | delegation |
| Read-only fan-out | Batch only independent questions, let the host schedule them, and fan in once at the root. | routing/delegation |
| Host-private worker execution | Keep physical paths out of Forge state; materialize and validate the bounded result canonically. | delegation |

## Delegation and results

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Bounded worker | Use the canonical `worker-brief-input/v1` renderer and pass only its validated projection. | worker-brief |
| Read-only result | Use `READ_ONLY` with status, task identity, concise findings, and precise evidence; omit irrelevant Git/delivery fields. | result |
| Writable result | Use `WRITABLE` with canonical candidate identity, changed paths, Git, and assigned validation evidence. | result |
| Review result | Use `review.md` and `REVIEW`, not an implementation profile. | review/result |
| Profile mismatch | Reject incomplete or incompatible results; do not fill fields from memory. | result |
| Dependent handoff | After accepted A, derive a compact B-specific `dependency_digest`; omit transcripts and unrelated material. | worker-brief |

## Verification and review

| Scenario | Required outcome | Owner |
 | --- | --- | --- |
| Behavior change with a seam | Record the seam and use focused behavioral evidence unless existing coverage is sufficient. | verification |
| No useful test surface | Record `not-applicable` or focused manual evidence; do not add ceremonial tests. | verification |
| Required check unavailable | Do not return `DONE` or `ACCEPTED`. | verification/evidence |
| Side-effecting check | Isolate or obtain explicit authorization before migration, deployment, publication, production, or shared effects. | verification |
| Final PR candidate | Select relevant groups, run them once against the committed candidate, then perform one fresh review. | verification/workflow |
| Review handoff | Include candidate identity, original ticket, complete initial focus, final diff, and validation evidence without transcript or policy prose. | workflow/review |
| Repairable finding | Repair once in focused context, rerun affected validation, and do not launch another reviewer. | review/recovery |
| Fundamental or uncertain finding | Preserve it and block delivery. | review |
| Repaired candidate | Require one repair commit and affected validation; report that it was not independently re-reviewed. | review/delivery |
| Trivial localized `SOLO` change | Review may be skipped with a recorded reason. | verification |
| Committed candidate at a phase boundary | Consume current Git-HEAD-bound evidence; do not rerun unchanged broad validation. | verification |
| PR creation completion boundary | After local gates and URL recording, report completion without awaiting or polling remote CI. | delivery/evidence |

## Authorization and routing

| Scenario | Required outcome |
| --- | --- |
| Branch setup, commit, push, PR, merge | Each action authorizes only itself; never infer the next action. |
| Push or PR action | Push does not create a PR; PR creation does not merge. |
| User says merged | Verify the relevant PR is actually `MERGED` before sync. |
| Guided `go` | Commit the reviewed slice only; do not push or create a PR. |
| Automatic routing | Prefer `SOLO`; use `SUBAGENTS` only for independently evaluable work with fresh native capability and visible fallback. |
| Scope or topology choice | Do not use it to bypass safety, validation, or delivery authorization. |
| Temporary cleanup | Remove only proven run-owned clean state; preserve ambiguity. |

## Adapter boundary

Adapters may translate host syntax, capabilities, lifecycle hooks, permissions,
and profiles. They must keep canonical workflow, contracts, routing, evidence,
delivery, and acceptance semantics unchanged. Installation remains user-level,
link-only, and separate from project configuration.
