# Execution Routing Policy

Choose the smallest topology that provides real coordination or reliability
value. `SOLO` and `SUBAGENTS` share one canonical writable delivery candidate;
the host owns physical worker execution and scheduling.

## Decision evidence

Prefer `SOLO`. Choose `SUBAGENTS` only when work is independently evaluable,
concise structured results materially reduce root coordination, continuity and
ownership are safe, and a native capability is freshly demonstrated. Do not
route from prompt length, difficulty, or file count alone. Keep a concise reason
and fallback evidence in the working spec or run state.

## Early discovery-shape assessment

After `PROCEED` and before broad discovery, assess discovery questions
separately from final topology:

```yaml
discovery_strategy:
  mode: ROOT_ONLY | DELEGATED_RESEARCH
  rationale: <why questions can or cannot leave the root>
  questions:
    - objective: <one bounded read-only question>
      allowed_scope: [<paths or symbols>]
      evidence_budget: <concise result limit>
  batch: FAN_OUT_FAN_IN | ROOT_ONLY | SEQUENTIAL
  capability: available | unavailable | unknown
  final_routing_deferred: true
```

Use `DELEGATED_RESEARCH` only for independent, read-only questions that are
likely to return useful evidence. A small independent batch fans out before
results are consumed and has one root fan-in barrier; the host may run ready
items concurrently or sequentially. Coupled questions stay in the root or use
a real dependency. No discovery worker chooses topology, delivery, or scope.

## Final routing

After specification and architecture:

1. identify coupling, independent ownership, coordination relief, continuity
   risk, and the root acceptance boundary;
2. prefer `SOLO` unless delegation materially helps;
3. require a fresh compatible native capability for `SUBAGENTS`; and
4. record `preferred`, `current`, a concise reason, and any fallback.

The run-state contract owns the routing fields. A preferred `SUBAGENTS` choice
may safely execute as effective `SOLO` or sequential root work when capability
is unavailable; never report preference as delegation.

Reassess only when discovery, recovery, delegation value, capability, or review
needs materially change. Do not append routing history or reassess at every turn
or unchanged phase boundary. Re-read durable state and Git after recovery before
changing topology.

## Topologies and fallback

`SOLO` keeps discovery, implementation, validation, review, and acceptance in
one root flow. `SUBAGENTS` adds bounded native research, analysis,
implementation, or fresh review when useful; writable results are materialized
and accepted sequentially in the canonical candidate. Workers do not create
peer channels, reroute the ticket, or own acceptance.

If native delegation is absent or untrusted, retain the preferred choice for
explanation, set the effective choice to `SOLO`/sequential, and record:

```text
preferred topology: SUBAGENTS
effective topology: SOLO
reason: native delegation capability unavailable
```
