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

The orchestrator identifies two genuinely independent read-only questions and
launches both bounded researcher briefs in one small first-wave batch, before
consuming either result. Each brief names one question, allowed reads, and a
concise evidence budget. The root waits at one fan-in barrier, accepts both
structured results, resolves any contradiction from repository evidence, and
then continues to specification. The workers do not communicate or write; once
each acceptance condition is met, they stop. A follow-up would be allowed only
for a `BLOCKED` result caused by a missing required fact.

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
routing:
  preferred: SUBAGENTS
  current: SUBAGENTS
requested_delivery: DEFAULT
delivery_mode: GUIDED
reason: API research, UI research, and test strategy are independent read-only tasks; submit one bounded logical fan-out/fan-in batch, let the host decide whether ready research runs concurrently or sequentially, then keep implementation sequential because the API contract and UI behavior are coupled.
fan_in: one root barrier after the batch
fallback: serialize research or use SOLO if native workers are unavailable
```


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
write_access: read-write
working_spec_ref: none
checkout_baseline:
  # Canonical delivery-candidate identity; not the worker's physical cwd.
  path: <absolute canonical delivery checkout path>
  head: <revision>
  branch: <canonical delivery branch defining the candidate>
  branch_setup: auto-created | reused | user-provided
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
testing:
  behavior: API filtering/cursor compatibility and admin URL-backed pagination behavior.
  seam: HTTP API response boundary and admin table URL/query boundary.
  existing_coverage: Focused API and UI tests cover adjacent behavior.
  approach: acceptance
  development_mode: test-after
  rationale: Add focused acceptance cases at both public boundaries without requiring a full browser run.
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
RESULT_PROFILE: WRITABLE
STATUS: DONE
TASK_ID: orders-pagination
BASE_SHA: <canonical delivery base>
HEAD_SHA: <canonical delivery head or none>
BRANCH: <canonical delivery branch>
FILES_CHANGED:
- services/orders/src/http/admin-orders.ts
- services/orders/src/repositories/order-repository.ts
- services/orders/tests/admin-orders.test.ts
- apps/admin/src/orders/OrdersTable.tsx
- apps/admin/src/orders/use-orders.ts
- apps/admin/src/orders/OrdersTable.test.tsx
GIT_STATE:
- clean
VALIDATION:
- command: <orders API focused tests>
  requirement: required
  condition: always
  applies: true
  result: passed
  evidence: invalid limits, filtering, cursor continuation, and compatibility pass
- command: <admin orders focused tests>
  requirement: required
  condition: always
  applies: true
  result: passed
  evidence: URL state and reset behavior pass
FINDINGS:
- API filtering and cursor handling remain compatible while admin pagination state is persisted in the URL.
EVIDENCE:
- services/orders/src/http/admin-orders.ts#pagination
- apps/admin/src/orders/OrdersTable.tsx#url-state
RISKS:
- A full browser integration run was not needed for the covered URL-state behavior.
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
routing:
  preferred: SUBAGENTS
  current: SUBAGENTS
requested_delivery: DEFAULT
delivery_mode: GUIDED
result: ACCEPTED
changed: API pagination/filter handling and admin URL-backed controls
validation: focused API tests, focused UI tests, typecheck, diff check passed
review: PASS
remaining_risks: none material for the ticket scope
```
