# Execution Routing Policy

Choose the smallest topology that provides real coordination or reliability
value. `SOLO` and `SUBAGENTS` share one canonical writable candidate; the host
owns worker execution and scheduling.

## Evidence

Prefer `SOLO`. Choose `SUBAGENTS` only when work is independently evaluable,
concise structured results reduce root coordination, continuity and ownership
are safe, and a compatible native capability is freshly demonstrated. Prompt
length, difficulty, and file count are not routing evidence. Record a concise
reason and fallback in the working spec or run state.

## Discovery shape

After `PROCEED` and before broad discovery, assess discovery separately from
final topology:

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

Use `DELEGATED_RESEARCH` only for independent read-only questions likely to
return useful evidence. Submit one small batch before consuming results and
wait at one root fan-in barrier; the host may schedule ready items either way.
Keep coupled questions in the root. Discovery workers do not choose scope,
topology, delivery, or acceptance.

## Final routing

After specification and architecture:

1. assess coupling, independent ownership, coordination relief, continuity
   risk, and the root acceptance boundary;
2. prefer `SOLO` unless delegation materially helps;
3. require fresh compatible native capability for `SUBAGENTS`; and
4. record `preferred`, `current`, reason, and fallback.

A preferred `SUBAGENTS` choice may execute as effective `SOLO` or sequential
root work when capability is unavailable. Never report preference as delegation.
Reassess only after a material change in discovery, recovery, delegation value,
capability, or review needs. After recovery, re-read state and Git first.

## Topologies and fallback

`SOLO` keeps discovery, implementation, validation, review, and acceptance in
the root. `SUBAGENTS` adds bounded native research, analysis, implementation,
or fresh review; writable results are materialized and accepted sequentially in
the canonical candidate. Workers do not communicate as peers, reroute the
ticket, or own acceptance.

If delegation is absent or untrusted, retain the preference for explanation,
set the effective topology to `SOLO`/sequential, and record the fallback.
