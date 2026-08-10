# Example: Herdr Ticket

This example shows when isolated worktrees and independent processes justify
Herdr. It is illustrative; replace command names with the installed Herdr
binary's current help output.

## Ticket

```text
Add an order-cancellation flow to the storefront.

The API must expose cancellation with authorization and state validation. The
web application must add the customer action, confirmation UI, and refresh
behavior. API and web work can proceed independently after the cancellation
contract is agreed. Both packages have separate development servers.
```

## Discovery and Architecture

Evidence shows:

- `services/orders/` owns order state transitions and authorization.
- `apps/storefront/` owns customer order details and mutation hooks.
- The packages have separate test commands and dev servers.
- The API response contract can be agreed before either implementation begins.

The shared contract is:

- only the order owner or authorized support role may cancel
- only `pending` and `processing` orders can be cancelled
- cancellation returns the existing order resource shape
- repeated cancellation is idempotent
- the UI refreshes the order after success and shows the established error
  presentation for rejected transitions

## Routing Decision

```text
execution_mode: HERDR
reason: API and web are independent writable packages with separate worktrees and long-running development servers.
```

Herdr is justified here because two writers need isolated checkouts and
separate processes. Native subagents in one checkout would violate the
concurrent-writer rule unless they provided equivalent isolation.

If `HERDR_ENV=1` is not set or Herdr is unavailable, the fallback is
`SUBAGENTS` with sequential implementation in one checkout.

## Worktree Plan

```text
central checkout: contract, integration, verification
api worktree: services/orders/** and API tests
web worktree: apps/storefront/** and UI tests
```

Each writable task receives a separate task contract:

```yaml
task_id: cancel-order-api
objective: Implement the authorized, idempotent cancellation endpoint.
dependencies: []
allowed_scope:
  - services/orders/**
forbidden_scope:
  - apps/storefront/**
acceptance:
  - unauthorized cancellation is rejected
  - invalid state is rejected with the established error shape
  - repeated cancellation is idempotent
validation:
  - <orders API tests>
risk: high
worktree: isolated
commit_policy: temporary
```

```yaml
task_id: cancel-order-web
objective: Add the customer cancellation action, confirmation UI, and refresh behavior.
dependencies: []
allowed_scope:
  - apps/storefront/**
forbidden_scope:
  - services/orders/**
acceptance:
  - action is shown only for cancellable orders
  - success refreshes the order
  - API rejection uses the established error presentation
validation:
  - <storefront order tests>
risk: medium
worktree: isolated
commit_policy: temporary
```

## Herdr Execution

After verifying `test "${HERDR_ENV:-}" = 1`, the orchestrator uses Herdr to
create or open the two worktree-backed workspaces. It starts one harness agent
in each worktree, sends only the corresponding task contract, and keeps user
focus unchanged with background panes.

The orchestrator waits for semantic agent states, reads each structured result,
and does not treat terminal output alone as completion. It may inspect each
worktree independently while the workers run.

## Integration

1. Confirm the API worker's result and isolated diff stay within
   `services/orders/**`.
2. Confirm the web worker's result and isolated diff stay within
   `apps/storefront/**`.
3. Integrate the API worktree commit into the central checkout.
4. Run API validation and confirm the shared contract.
5. Integrate the web worktree commit into the central checkout.
6. Run UI validation and the relevant cross-package checks.
7. Resolve any conflict centrally; never ask both workers to edit the central
   checkout.

## Review and Acceptance

A fresh reviewer receives the original ticket, cancellation contract, both
results, the integrated diff, and all validation output. It checks
authorization, state transitions, idempotency, UI gating, error handling,
concurrency, and accidental cross-scope changes.

Herdr workspaces and panes created for the run are cleaned up after integration.
User-owned sessions, branches, and the Herdr server are left untouched.

The final report records:

```text
execution_mode: HERDR
result: ACCEPTED | BLOCKED | FAILED
worktrees: api, web
validation: API checks, UI checks, cross-package checks, and review result
fallback_used: no
remaining_risks: <explicitly state any unresolved risk>
```
