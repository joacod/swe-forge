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
execution_mode: SOLO
requested_provider: AUTO
execution_provider: NONE
parallel_strategy: NONE
integration_strategy: NONE
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
paths, a testing decision, validation, and delivery authorization. It is
deleted during cleanup
and is never committed.

## Execution

The agent implements and validates cohesive slices, creating one local commit
for each passing slice with a concise subject. For `ISOLATED`, those become
central integration commits on the one integration/delivery branch after each
accepted worker unit; worker branches remain local-only. It runs the final required
checks, performs a fresh review, repairs blocking findings as additional
commits, and inspects the final diff. It does not stop after each slice for user
approval.

After all final gates pass, `PR` mode pushes the one task branch (or the one
isolated integration/delivery branch) and creates exactly one pull request with
a short title and summary, validation, and relevant-risk notes. The final
report contains the PR URL. Merge remains a human action.

After the user merges the PR, they can say `merged` or invoke `git-sync merged`.
The sync action verifies the provider reports `MERGED` before returning to the
remote default branch and fast-forwarding it. PR creation never implies that
synchronization or merge has happened.
