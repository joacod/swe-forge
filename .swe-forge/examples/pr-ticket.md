# Example: Default PR Delivery Ticket

This example shows the default low-touch delivery path. It skips interactive
human checkpoints, but not verification, fresh review, protected-branch rules,
or merge safety.

## Invocation

```text
/swe-forge add-health-check
```

The explicit `/swe-forge pr add-health-check` form remains an equivalent
backwards-compatible alias.

The parser records:

```text
requested_mode: AUTO
routing:
  preferred: SOLO
  current: SOLO
requested_delivery: DEFAULT
delivery_mode: PR
reason: One tightly coupled endpoint and test can be implemented and verified in one context.
fallback_used: no
```

## Brief Alignment

If the ticket does not already state the endpoint behavior, compatibility
expectation, non-goals, and validation, the agent reads the repository first and
asks one short round of high-leverage questions. It records the answers in a
working spec outside the repository:

```text
$TMPDIR/swe-forge/<run-id>/working-spec.md
```

The spec contains observable requirements, scenarios, assumptions, affected
paths, a testing decision, validation, an initial `review_focus` brief, and
delivery authorization. The review focus names the complete ticket-relevant
goal, acceptance criteria, constraints, relevant architecture and quality
concerns, non-goals, and the boundary for actionable findings.
It is deleted during cleanup
and is never committed.

## Execution

During implementation, the agent uses its judgment about commit boundaries.
A small cohesive ticket may use one checkpoint and commit; a larger cohesive
result may use several. It runs targeted checks for the current implementation
slice before recording an optional checkpoint and its materializing commit. No
commit sequence is declared in the working spec, and the agent may keep the
whole change together rather than manufacture ceremonial commits.

After implementation is complete, it selects the relevant final validation
groups and runs them once, then performs one fresh independent review against
that same committed candidate. CI, release preparation, and high-risk
cross-cutting work may select the explicit `full` bundle.
The handoff contains the complete ticket-relevant `review_focus`, so it is the
one comprehensive semantic review without workflow prose or the implementer's
transcript. A `PASS` goes directly to final acceptance.

If the review requires changes, the root repairs only a concrete, localized,
clearly repairable finding. It builds a focused repair context from the finding,
repair delta, directly affected criteria, and affected checks, then runs that
validation and records the explicit review-repair checkpoint and commit. It
does not invoke another reviewer. The repaired candidate is reported as not
independently re-reviewed. A fundamental or materially uncertain finding blocks
delivery. Unrelated improvements are recorded as deferred follow-ups rather
than pulled into the PR. It does not stop after each slice for user approval.

After local gates pass, PR creation is the synchronous boundary: push, create
the PR, record its URL and local receipt, report the result, and stop. Remote
GitHub CI is external and is not awaited by this run.

After all final gates pass, `PR` mode pushes the one task branch and creates
exactly one pull request with a concise, project-facing title and body. The body
explains the outcome and motivation, lists only relevant validation, and notes
material risks or follow-ups when needed. It follows repository conventions and
never includes a receipt, tool/process metadata, transcript, or unrelated
detail. The harness output also starts with a short human-facing summary,
separate from the receipt:

```text
Work summary:
- Added the health-check endpoint and focused coverage so callers can verify service availability.
- Notes: no migration or external-service changes.
```

The executable
gate keeps the receipt at `$STATE/receipt.md` by default and records its path in
`receipt_ref`, so the evidence remains available in the private run state
without changing the PR. The final report contains the PR URL. Merge remains a
human action.

After the user merges the PR, they can say `merged` or invoke `git-sync merged`.
The sync action verifies the remote PR state reports `MERGED` before returning
to the remote default branch and fast-forwarding it. PR creation never implies
that synchronization or merge has happened.
