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
paths, validation, and delivery authorization. It is deleted during cleanup
and is never committed.

## Execution

The agent implements the bounded change, runs the required checks, performs a
fresh review, repairs blocking findings, and inspects the final diff. It does
not stop after each implementation slice for user approval.

After all gates pass, `PR` mode authorizes the orchestrator to create a safe
feature branch when starting from a clean protected default branch, commit the
reviewed result, push the branch, and create a pull request. The final report
contains the PR URL. Merge remains a human action.

After the user merges the PR, they invoke the separate `git-sync` action to
return to the remote default branch and fast-forward it. PR creation never
implies that synchronization or merge has happened.
