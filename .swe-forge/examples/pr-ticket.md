# Example: PR Delivery Ticket

This example shows the low-touch delivery path. It skips human checkpoints,
but not verification, fresh review, protected-branch rules, or merge safety.

## Invocation

```text
/swe-forge pr add-health-check
```

The parser records:

```text
requested_mode: AUTO
routing:
  initial: SOLO
  preferred: SOLO
  selected: SOLO
  current: SOLO
requested_delivery: PR
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
paths, a testing decision, validation, a `review_focus` brief, and delivery
authorization. The review focus names the ticket goal, acceptance criteria,
relevant quality concerns, non-goals, and the boundary for actionable findings.
It is deleted during cleanup
and is never committed.

## Execution

Before editing, the working spec records an ordered commit plan. Each step names
one cohesive objective, scope, dependencies, targeted validation, and commit
subject. The agent implements and validates one step, creates its local commit,
and then starts the next step; it does not defer commits until the end. A single
inseparable step remains one commit. It runs the final required checks, performs
a fresh acceptance-first review within the review focus, repairs blocking
in-scope findings as additional commits, and inspects the final diff. Unrelated
improvements are recorded as deferred follow-ups rather than pulled into the
PR. It does not stop after each slice for user approval.

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
