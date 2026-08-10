# Example: Parallel Ticket

This is a complete illustrative run for a ticket where independent research is
useful, but concurrent writers would create unnecessary conflict. The example
uses native subagents for read-only work and keeps implementation sequential.

## 1. Ticket

```text
Add server-side pagination and status filtering to the admin orders list.

Requirements:
- GET /admin/orders accepts status, limit, and cursor.
- Invalid limits return HTTP 400.
- The response includes next_cursor when more results exist.
- Existing unfiltered callers remain compatible.
- The admin table stores status and cursor state in the URL.
- Add focused API and UI coverage.
```

## 2. Discovery

Two read-only workers inspect independent areas in the first wave.

Research result from the API worker:

- `services/orders/src/http/admin-orders.ts` owns the route.
- `services/orders/src/repositories/order-repository.ts` already accepts a
  status predicate but returns the full collection.
- `services/orders/tests/admin-orders.test.ts` uses the repository test fixture.
- Existing API responses preserve unknown fields for compatibility.

Research result from the UI worker:

- `apps/admin/src/orders/OrdersTable.tsx` owns the table query state.
- `apps/admin/src/orders/use-orders.ts` builds the request URL.
- `apps/admin/src/orders/OrdersTable.test.tsx` covers empty and populated lists.
- URL state uses the existing query-string helper.

Test-strategy result:

- Add API cases for invalid limit, status filtering, cursor continuation, and
  an unfiltered request.
- Add UI cases for URL initialization, status changes, and next-page behavior.
- No full end-to-end browser run is needed unless the repository's quality gate
  requires it.

## 3. Specification

Acceptance criteria:

- `status` filters orders without changing the default unfiltered result.
- `limit` is bounded by the repository's existing API convention.
- Invalid `limit` returns HTTP 400 with the established error shape.
- `next_cursor` is omitted when there is no next page.
- Existing callers that omit all new parameters remain compatible.
- The admin URL represents the selected status and cursor.
- API and UI focused tests pass.

Assumptions:

- The repository's existing cursor encoding is safe to reuse.
- The current API error format is the compatibility boundary.

Risks:

- cursor ordering must remain stable while new orders are inserted
- UI reset behavior must clear a stale cursor when status changes

## 4. Architecture

Reuse the existing repository query and query-string helpers. Add cursor
translation at the HTTP boundary, keep the response shape backward compatible,
and reset the UI cursor when the status filter changes.

## 5. Decomposition

```yaml
tasks:
  api-research:
    role: researcher
    access: read-only
    dependencies: []
  ui-research:
    role: researcher
    access: read-only
    dependencies: []
  test-strategy:
    role: test-engineer
    access: read-only
    dependencies: []
  implementation:
    role: implementer
    access: read-write
    dependencies:
      - api-research
      - ui-research
      - test-strategy
  review:
    role: reviewer
    access: read-only
    dependencies:
      - implementation
```

## 6. Routing Decision

```text
requested_mode: AUTO
execution_mode: SUBAGENTS
reason: API research, UI research, and test strategy are independent read-only tasks; implementation is kept sequential because the API contract and UI behavior are coupled.
worker_limit: 3
fallback: serialize research or use SOLO if native workers are unavailable
```

The orchestrator does not use Herdr because no concurrent writable worktree or
independent process is needed.

## 7. Task Contract

The implementation worker receives a bounded contract:

```yaml
task_id: orders-pagination
objective: Implement the API and admin UI pagination behavior described above.
reason: Research and test strategy are complete; one writer can preserve the API/UI contract safely.
owner_role: implementer
dependencies:
  - api-research
  - ui-research
  - test-strategy
execution_mode: SUBAGENTS
write_access: read-write
worktree: shared
checkout_baseline:
  path: <absolute checkout path>
  head: <revision>
  branch: <branch>
  classification: writable
  remote_default_evidence: <reference>
  staged: []
  unstaged: []
  untracked: []
delegation:
  allowed: false
allowed_scope:
  - services/orders/src/http/admin-orders.ts
  - services/orders/src/repositories/order-repository.ts
  - services/orders/tests/admin-orders.test.ts
  - apps/admin/src/orders/**
forbidden_scope:
  - unrelated services
  - global query-string helpers
acceptance:
  - all ticket criteria pass
validation:
  - command: <orders API focused tests>
    requirement: required
    condition: always
    side_effects: local-only
  - command: <admin orders focused tests>
    requirement: required
    condition: always
    side_effects: local-only
risk: medium
expected_output:
  - implementation
  - focused test evidence
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

## 8. Implementation Result

This block is hypothetical expected output after replacing and running the
repository-specific command placeholders:

```text
STATUS: DONE
TASK_ID: orders-pagination
SUMMARY: Added status and cursor handling at the API boundary and persisted the filter state in the admin URL.
FILES_TOUCHED:
- services/orders/src/http/admin-orders.ts
- services/orders/src/repositories/order-repository.ts
- services/orders/tests/admin-orders.test.ts
- apps/admin/src/orders/OrdersTable.tsx
- apps/admin/src/orders/use-orders.ts
- apps/admin/src/orders/OrdersTable.test.tsx
TESTS_RUN:
- command: <orders API focused tests>
  requirement: required
  condition: always
  result: passed
- command: <admin orders focused tests>
  requirement: required
  condition: always
  result: passed
TEST_RESULTS: Invalid limits, filtering, cursor continuation, compatibility, URL state, and reset behavior pass.
EVIDENCE:
- API response omits next_cursor at the end of the result set.
- Status changes clear the prior cursor before fetching.
ASSUMPTIONS:
- Existing cursor encoding remains stable.
RISKS:
- A full browser integration run was not needed for the covered URL-state behavior.
FOLLOWUPS: none.
```

## 9. Integration and Verification

The orchestrator inspects the worker's diff and confirms every touched path is
within the task contract. It runs the focused API and UI checks, then runs the
repository typecheck because both server and UI interfaces changed.

```text
<orders API focused tests>       passed
<admin orders focused tests>     passed
<repository typecheck>           passed
git diff --check                 passed
```

## 10. Independent Review

The reviewer receives the original ticket, acceptance criteria, architecture
brief, final diff, and the output above. It returns:

```yaml
status: PASS
findings: []
```

The review specifically checks compatibility for unfiltered callers, stale
cursor reset behavior, invalid input handling, and unrelated modifications.

## 11. Final Acceptance

The orchestrator compares the final diff to the original ticket, confirms all
acceptance criteria and relevant quality gates pass, confirms the reviewer has
no critical or high-confidence correctness finding, and reports:

```text
requested_mode: AUTO
execution_mode: SUBAGENTS
result: ACCEPTED
changed: API pagination/filter handling and admin URL-backed controls
validation: focused API tests, focused UI tests, typecheck, diff check passed
review: PASS
remaining_risks: none material for the ticket scope
```
