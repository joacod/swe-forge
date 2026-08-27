# Example: Independent Research, Sequential Writes

Ticket: add pagination and status filtering to an admin orders list, preserving
unfiltered callers and adding focused API/UI coverage.

## Discovery

The root identifies two independent read-only questions:

```yaml
tasks:
  api-research:
    role: researcher
    scope: API route, repository query, and API tests
  ui-research:
    role: researcher
    scope: table query state, URL helper, and UI tests
  implementation:
    role: implementer
    dependencies: [api-research, ui-research]
```

Each researcher gets one bounded question, allowed reads, evidence budget, and
the `READ_ONLY` result contract. Submit one logical fan-out, wait at one root
fan-in barrier, and resolve contradictions centrally. The host may schedule
ready items concurrently or sequentially.

## Specification

```yaml
goal: Add compatible API pagination/filtering and URL-backed admin controls.
scope:
  in: [orders API, admin orders URL state, focused API/UI tests]
  out: [unrelated query helpers and full browser audit]
acceptance:
  - status filters without changing the default unfiltered result
  - invalid limits use the established HTTP 400 shape
  - cursors and URL state behave correctly
  - focused tests pass
approach: Reuse existing pagination and query-string helpers.
risks: [reset a stale cursor when status changes]
validation:
  testing:
    behavior: API filtering/cursors and URL-backed admin pagination
    seam: API response and admin URL/query boundaries
    approach: acceptance
    rationale: Focused API/UI cases cover both surfaces.
  checks: [focused API tests, focused UI tests, relevant typecheck]
review_focus:
  goal: Confirm endpoint behavior, URL state, and compatibility.
  acceptance_criteria_checked: [filtering, invalid limits, cursors, URL state]
```

Research is independent; implementation remains one bounded writer because the
contract is coupled. Without native workers, use root-owned sequential research
without claiming delegation.

## Handoff

Create and validate one canonical JSON worker brief. The implementation brief
contains its objective, allowed scope, acceptance, validation, permissions, and
accepted dependency digest—not the transcript or full research. Validate the
result in the canonical checkout before root acceptance.

Run final validation once, review the same candidate once, and apply the normal
Acceptance Gate. One concrete localized finding may get one focused repair; no
second review.
