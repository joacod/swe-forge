# Ticket Workflow

Read this procedure after explicit SWE Forge activation. It defines order and
stage-triggered loading; linked policies, contracts, and roles own details.

## Artifact boundary

Keep the transient PR working spec, task contracts, worker briefs, and results
in active context or restricted temporary storage. Never commit them. Keep run
state and validation evidence outside the repository or under ignored
`.swe-forge/runs/`. Use `contracts/task.md`, `result.md`, and `review.md` for
delegated work and review.

## Procedure

### 1. Ingest

Invoke `.swe-forge/tools/swe-forge-invocation` exactly once with the complete
raw argument string unless the host supplied normalized facts. Keep
`raw_arguments` immutable and consume only `parsed_ticket`, `delivery_mode`, and
`input_status`.

`COMPLETE` proceeds. `EMPTY` and `INCOMPLETE` request the missing ticket; do
not initialize a run. Preserve skill references as input, not installation or
execution permission. Record the ticket's requested behavior, constraints,
non-goals, affected surfaces, validation, and delivery/checkpoint preference.
Pass normalized `delivery_mode` and selected internal routing unchanged to state
initialization.

### 2. Discover and scope

Start with lightweight root-owned discovery. Load `policies/specification.md`
and make exactly one semantic `scope_decision`:

- `PROCEED` continues;
- `TOO_BROAD` explains independent chunks, suggests separate tickets, and
  stops before specification, decomposition, routing, validation,
  implementation, review, and delivery.

Before broad discovery after `PROCEED`, load
`policies/execution-routing.md` and assess discovery shape separately from final
topology. Delegate only independent, read-only questions with concise evidence;
fan out once and fan in once at the root. Keep coupled questions in the root.
Then inspect relevant code, dependencies, tests, conventions, and quality gates.
Load `policies/specialist-skills.md` only for a named or clearly fitting skill.

### 3. Specify and route

For `PR`, load `contracts/working-spec.md` and build the transient spec. Derive
observable acceptance, bounded scope and non-goals, the smallest approach,
risks, testing, validation, and initial review focus. Ask only blocking
questions; record low-risk assumptions.

Choose the compatible approach and ownership order before editing. Load
`policies/execution-routing.md` for final routing. Prefer `SOLO`; choose
`SUBAGENTS` only when bounded delegation has independent value and fresh native
capability. Record preferred/current topology, reason, and fallback.

When delegating, load `policies/delegation.md`, the role, and task/result/review
contracts. Give each task one objective, non-overlapping scope, dependencies,
acceptance, assigned validation, risk, and authorization. Immediately before a
launch, create one canonical JSON worker brief, validate it with:

```text
../tools/swe-forge-worker-brief validate --brief FILE
```

Pass that brief unchanged with the role and selected contract. Accepted
preceding work may supply only a compact, task-specific `dependency_digest`.

### 4. Test, implement, integrate

Before selecting or executing checks, load `policies/verification.md`; load
`policies/evidence.md` when recording executable evidence or relying on a Git
candidate identity. Record one testing decision before implementation:
behavior, seam, existing coverage, smallest useful approach, and rationale.

Before the first writable setup or edit, load `policies/delivery.md`. Use one
canonical delivery branch and checkout. Materialize delegated writes there and
accept them sequentially after checking task identity, scope, candidate
identity, Git state, assigned validation, and blockers. Workers cannot authorize
delivery or expand scope.

### 5. Verify

Run the smallest final validation groups covering changed surfaces once the
candidate is complete and cleanly committed. Bind every result to its full Git
`HEAD`; report passed, failed, skipped, unavailable, and not-applicable checks
distinctly. A repair reruns only affected checks against the new `HEAD`.

### 6. Review and repair

When the review trigger applies, load the reviewer role and
`contracts/review.md`. Use fresh read-only context and pass one concise initial
handoff containing the ticket, complete review focus, candidate `HEAD`, final
diff, and validation evidence—not a transcript or workflow prose.

`CHANGES_REQUIRED` permits one focused repair only when the finding is concrete,
localized, and clearly repairable. Commit it, rerun affected validation, and
record that the repaired candidate was not independently re-reviewed.
Fundamental or uncertain findings block.

### 7. Accept, deliver, report

Apply the one Acceptance Gate in `SWE-FORGE.md`. Perform only authorized
checkout, commit, push, PR, merge, publication, deployment, and cleanup actions.
Use the final report requirements there. Do not await or poll remote CI after PR
creation.

## Recovery

On `BLOCKED` or `FAILED`, load `policies/failure-recovery.md`. Inspect actual
state, Git, and evidence before continuing; preserve the candidate and do not
repeat completed semantic work. Use its bounded retry and repair rules.

## Blocking

If a gate is unmet, preserve the candidate and report the missing acceptance,
evidence, authorization, or environment condition. Never report `DONE` or
`ACCEPTED` without its required evidence.
