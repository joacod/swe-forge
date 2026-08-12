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
requested_mode: AUTO
execution_mode: HERDR
requested_delivery: DEFAULT
delivery_mode: GUIDED
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
reason: The API work is independently owned in an isolated worktree.
owner_role: implementer
dependencies: []
execution_mode: HERDR
write_access: read-write
worktree: isolated
delivery_mode: GUIDED
working_spec_ref: none
checkout_baseline:
  path: <absolute API worktree path>
  head: <revision>
  branch: <isolated API worker branch>
  branch_setup: auto-created | reused | user-provided
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []
delegation:
  allowed: false
allowed_scope:
  - services/orders/**
forbidden_scope:
  - apps/storefront/**
acceptance:
  - unauthorized cancellation is rejected
  - invalid state is rejected with the established error shape
  - repeated cancellation is idempotent
testing:
  behavior: Authorized, state-valid, and idempotent cancellation at the API boundary.
  seam: Cancellation API response boundary.
  existing_coverage: <orders API tests or none found>
  approach: acceptance
  development_mode: test-after
  rationale: Cover authorization, invalid state, and repeat behavior through the API.
validation:
  - command: <orders API tests>
    requirement: required
    condition: always
    side_effects: local-only
risk: high
expected_output:
  - bounded implementation and test evidence
  - structured worker result
authorization:
  create_branch: {status: not-authorized, provenance: none, scope: none}
  create_worktree: {status: not-authorized, provenance: none, scope: none}
  commit: {status: not-authorized, provenance: none, scope: none}
  push: {status: not-authorized, provenance: none, scope: none}
  create_pull_request: {status: not-authorized, provenance: none, scope: none}
  publish: {status: not-authorized, provenance: none, scope: none}
  merge: {status: not-authorized, provenance: none, scope: none}
```

```yaml
task_id: cancel-order-web
objective: Add the customer cancellation action, confirmation UI, and refresh behavior.
reason: The storefront work is independently owned in an isolated worktree.
owner_role: implementer
dependencies: []
execution_mode: HERDR
write_access: read-write
worktree: isolated
delivery_mode: GUIDED
working_spec_ref: none
checkout_baseline:
  path: <absolute storefront worktree path>
  head: <revision>
  branch: <isolated storefront worker branch>
  branch_setup: auto-created | reused | user-provided
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []
delegation:
  allowed: false
allowed_scope:
  - apps/storefront/**
forbidden_scope:
  - services/orders/**
acceptance:
  - action is shown only for cancellable orders
  - success refreshes the order
  - API rejection uses the established error presentation
testing:
  behavior: Visibility, refresh, and rejection presentation for cancellation.
  seam: Storefront order detail UI and mutation boundary.
  existing_coverage: <storefront order tests or none found>
  approach: acceptance
  development_mode: test-after
  rationale: Cover the customer-visible states through the existing UI boundary.
validation:
  - command: <storefront order tests>
    requirement: required
    condition: always
    side_effects: local-only
risk: medium
expected_output:
  - bounded implementation and test evidence
  - structured worker result
authorization:
  create_branch: {status: not-authorized, provenance: none, scope: none}
  create_worktree: {status: not-authorized, provenance: none, scope: none}
  commit: {status: not-authorized, provenance: none, scope: none}
  push: {status: not-authorized, provenance: none, scope: none}
  create_pull_request: {status: not-authorized, provenance: none, scope: none}
  publish: {status: not-authorized, provenance: none, scope: none}
  merge: {status: not-authorized, provenance: none, scope: none}
```

## Herdr Execution

After the user authorizes creation of the planned worktrees, the orchestrator
verifies `test "${HERDR_ENV:-}" = 1` and uses Herdr to create or open the two
worktree-backed workspaces. The central checkout has one automatically created
or reused task branch for the run; each worker receives its own isolated branch.
Before edits, it confirms the integration checkout and both worker checkouts are
dedicated, non-protected, attached, and safely classifiable. It starts one
harness agent in each worktree, sends only the corresponding task contract, and
keeps user focus unchanged with background panes.

The orchestrator records the user's worktree-creation authorization in run
state. The worker contracts keep `create_worktree` as `not-authorized` because
the workers receive already-created checkouts and must not create additional
ones.

The orchestrator waits for semantic agent states, reads each structured result,
and does not treat terminal output alone as completion. It may inspect each
worktree independently while the workers run.

## Integration

1. Confirm the API worker's result and isolated diff stay within
   `services/orders/**`.
2. Confirm the web worker's result and isolated diff stay within
   `apps/storefront/**`.
3. Integrate the API worktree patch into the central checkout.
4. Run API validation and confirm the shared contract.
5. Integrate the web worktree patch into the central checkout.
6. Run UI validation and the relevant cross-package checks.
7. Resolve any conflict centrally; never ask both workers to edit the central
   checkout.

## Review and Acceptance

A fresh reviewer receives the original ticket, cancellation contract, both
results, the integrated diff, and all validation output. It checks
authorization, state transitions, idempotency, UI gating, error handling,
concurrency, and accidental cross-scope changes.

Herdr workspaces and panes created for the run are cleaned up after integration.
Before worktree removal, each worker status is clean or its tracked and untracked
changes are proven integrated or preserved. User-owned sessions, branches, and
the Herdr server are left untouched.

The final report records:

```text
requested_mode: AUTO
execution_mode: HERDR
requested_delivery: DEFAULT
delivery_mode: GUIDED
result: ACCEPTED | BLOCKED | FAILED
worktrees: api, web
validation: API checks, UI checks, cross-package checks, and review result
fallback_used: no
remaining_risks: <explicitly state any unresolved risk>
```
