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

Each researcher receives one bounded question, allowed reads, an evidence
budget, and the `READ_ONLY` result contract. The root submits the independent
questions as one logical fan-out, waits at one fan-in barrier, and resolves
contradictions centrally. The host may schedule them concurrently or
sequentially.

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
approach: Reuse existing repository pagination and query-string helpers.
risks:
  - reset a stale cursor when status changes
validation:
  testing:
    behavior: API filtering/cursors and URL-backed admin pagination
    seam: API response and admin URL/query boundaries
    approach: acceptance
    rationale: Focused API/UI cases cover both public surfaces.
  checks: [focused API tests, focused UI tests, relevant typecheck]
```

Research is useful because the API and UI facts can be checked independently;
implementation remains one bounded writer because their contract is coupled.
If native workers are unavailable, use root-owned sequential research without
claiming delegation.

## Handoff

Before launch, render and validate `worker-brief-input/v1`. The implementation
brief contains only its objective, allowed scope, acceptance, validation,
permissions, and accepted dependency digest. It does not contain the root
transcript or full research results. The result is materialized and validated in
the canonical delivery checkout before root acceptance.

The root then runs final validation once, performs one fresh review of the same
candidate, and applies the normal Acceptance Gate. One concrete localized
review finding may receive one focused repair; no second review is launched.
