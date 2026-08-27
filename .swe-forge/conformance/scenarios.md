# Workflow Conformance Scenarios

Smoke-test index for activation, routing, contracts, safety, and adapters. Owner
files define behavior; these rows record observable outcomes only.

## Invocation and scope

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Empty/incomplete invocation | Request the missing ticket; do not invent one. | invocation tool |
| Default delivery | `delivery_mode: PR` with automatic topology. | invocation/spec |
| Delivery modifier | Leading lowercase `guided` selects `GUIDED`; topology words and uppercase tokens remain ticket text. | invocation tool |
| Cohesive ticket | `PROCEED`; size, prompt length, file count, and ordered steps do not reject it. | specification |
| Independent/open-ended bundle | `TOO_BROAD`, suggested chunks, and stop before downstream workflow. | specification |
| Optional skill | Preserve and evaluate its source; never install automatically. | specialist-skills |

## State and load order

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Current run state | Schema v5 validates the compact run fence, route, checkout, continuation, candidate-bound validation/review, and delivery facts. | run-state |
| Old/future/malformed/obsolete state | Reject clearly; never migrate, normalize, or guess. | run-state |
| Preferred/effective divergence | Preferred `SUBAGENTS` may fall back to effective `SOLO`. | routing/run-state |
| Duplicate projections | Do not persist requested modes, receipts, checkpoints, fingerprints, or copied delivery-mode continuation. | run-state |
| Active-state selection | Ignore stale, terminal, wrong-checkout, or obsolete candidates; choose the newest valid one. | state tool |
| Normal load | Spec before clarification; routing before final topology; verification before checks; delivery before first write; recovery only on trigger. | workflow |
| PR spec | Load `contracts/working-spec.md` before building it. | workflow |
| Evidence features | Load evidence policy before recording executable validation or relying on candidate identity. | workflow |

## Continuity, checkout, ownership

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Discontinuity/recovery | Re-read authoritative state and inspect actual Git/evidence; do not repeat completed semantic work. | state/workflow |
| Host retry | Keep it separate from Forge task retry and inspect post-retry state. | failure-recovery |
| Clean protected default | Create one dedicated branch and record setup before editing. | delivery |
| Dirty/detached/protected/ambiguous checkout | Do not edit, reset, stash, clean, overwrite, or deliver; preserve and report. | delivery |
| Dirty out-of-scope path | Preserve it; exclude it from attribution and delivery. | delivery |
| Multiple writable workers | Materialize and accept results sequentially in one canonical checkout. | delegation |
| Read-only fan-out | Batch only independent questions; fan in once at root; host controls scheduling. | routing/delegation |
| Private worker execution | Keep physical paths out of Forge state; materialize and validate the bounded result canonically. | delegation |

## Delegation and results

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Bounded worker | Create, validate, and pass one unchanged canonical JSON brief. | worker-brief |
| Read-only result | `READ_ONLY`, identity, status, concise findings, precise evidence; no irrelevant Git/delivery fields. | result |
| Writable result | `WRITABLE`, candidate identity, changed paths, Git, and assigned validation evidence. | result |
| Review result | Use `review.md` and `REVIEW`, not an implementation profile. | review/result |
| Profile mismatch | Reject incomplete or incompatible results; do not fill fields from memory. | result |
| Dependent handoff | After accepting A, derive a compact B-specific digest in B's brief; omit transcripts and unrelated material. | worker-brief |

## Verification and review

| Scenario | Required outcome | Owner |
| --- | --- | --- |
| Behavior change with seam | Record the seam and use focused behavioral evidence unless existing coverage suffices. | verification |
| No useful test surface | Record `not-applicable` or focused manual evidence; no ceremonial tests. | verification |
| Required check unavailable | Do not return `DONE` or `ACCEPTED`. | verification/evidence |
| Side-effecting check | Isolate or authorize migrations, deployment, publication, production, or shared effects. | verification |
| Final PR candidate | Run selected groups once on the committed candidate, then one fresh review. | verification/workflow |
| Review handoff | Include candidate, ticket, complete focus, final diff, and validation evidence; no transcript or policy prose. | workflow/review |
| Repairable finding | Repair once in focused context, rerun affected validation, and do not launch another reviewer. | review/recovery |
| Fundamental/uncertain finding | Preserve it and block delivery. | review |
| Repaired candidate | Require one repair commit and affected validation; report no independent re-review. | review/delivery |
| Trivial localized `SOLO` change | Review may be skipped with a reason. | verification |
| Phase boundary | Consume current Git-HEAD-bound evidence; do not rerun unchanged broad validation. | verification |
| PR completion | After local gates and URL recording, report without awaiting/polling remote CI. | delivery/evidence |
| Final report | Lead with status, PR/no-PR, confidence, validation, review/repair, and residual risk; omit routine internals. | SWE-FORGE.md |

## Authorization and routing

| Scenario | Required outcome |
| --- | --- |
| Branch, commit, push, PR, merge | Each action authorizes only itself. |
| Push or PR | Push does not create a PR; PR creation does not merge. |
| User says merged | Verify the relevant PR is actually `MERGED` before sync. |
| Guided `go` | Commit the reviewed local slice only; do not push or create a PR. |
| Automatic routing | Prefer `SOLO`; use `SUBAGENTS` only for independently evaluable work with fresh capability and visible fallback. |
| Temporary cleanup | Remove only proven run-owned clean state; preserve ambiguity. |

## Adapter boundary

Adapters may translate host syntax, capabilities, lifecycle hooks, permissions,
and profiles. They must not redefine workflow, contracts, routing, evidence,
delivery, or acceptance. Installation remains user-level and link-only, separate
from project configuration.
