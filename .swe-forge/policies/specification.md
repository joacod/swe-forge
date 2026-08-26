# Specification Policy

Translate one ticket into a bounded, observable agreement without turning it
into a documentation project. The original ticket, explicit user decisions,
and repository evidence remain authoritative.

## Scope decision

After lightweight root-owned discovery, make exactly one transient decision:

```text
scope_decision: PROCEED | TOO_BROAD
```

Ask whether the request can produce one cohesive reviewable PR with one primary
outcome and a bounded implementation surface. Size, prompt length, file count,
and effort are not rejection criteria. Choose `TOO_BROAD` only for an epic,
independent improvements bundled together, an open-ended rewrite, or work that
should clearly be separate tickets.

For `TOO_BROAD`, return a short reason and major chunks:

```text
scope_decision: TOO_BROAD
reason: <why the outcomes are independent or open-ended>
submit separately:
- <major chunk>
- <major chunk>
```

Stop before specification, architecture, decomposition, routing, validation,
implementation, review, or delivery. Do not create a working spec or task
artifacts. `PROCEED` continues the normal workflow and does not select a
topology.

## Specification

A `GUIDED` run derives acceptance during ingest and asks only blocking
questions. A `PR` run always builds the transient working spec; it may skip
clarification when the ticket already supplies a clear goal, bounded scope,
observable acceptance, non-goals, approach, risks, and validation.

The spec contract defines the minimum shape. Keep facts, assumptions, user
decisions, and open questions distinct. Ask the user only about intent,
priority, behavior, compatibility, risk tolerance, or external actions that
cannot be safely inferred. Inspect repository facts yourself.

When clarification is needed, read the repository first, then ask one concise
round of up to four high-leverage questions with recommendations. Ask a second
short round only for a remaining blocking decision. Proceed on low-risk
assumptions and record them. Do not pursue speculative requirements or
terminology cleanup.

Before writing, the spec must expose a concrete goal, bounded scope, observable
acceptance, an approach, meaningful risks when present, a testing decision,
validation checks, and an initial review focus covering the ticket-relevant
surface.
