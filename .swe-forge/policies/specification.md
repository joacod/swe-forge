# Specification Policy

Translate one ticket into a bounded, observable agreement. The original ticket,
user decisions, and repository evidence remain authoritative.

## Scope decision

After lightweight root-owned discovery, make exactly one transient decision:

```text
scope_decision: PROCEED | TOO_BROAD
```

Ask whether the request can produce one cohesive reviewable PR with one primary
outcome and bounded implementation surface. Size, prompt length, file count,
and effort are not rejection criteria. Use `TOO_BROAD` only for an epic,
independent bundled improvements, an open-ended rewrite, or work that clearly
belongs in separate tickets.

For `TOO_BROAD`, return:

```text
scope_decision: TOO_BROAD
reason: <independent or open-ended outcome>
submit separately:
- <major chunk>
- <major chunk>
```

Stop before specification, architecture, decomposition, routing, validation,
implementation, review, or delivery. Do not create a working spec or task
artifacts. `PROCEED` does not select topology.

## Specification

`GUIDED` derives acceptance during ingest. `PR` always builds the transient
working spec and may skip clarification when the ticket already supplies the
needed facts.

Keep facts, assumptions, user decisions, and open questions distinct. Ask only
about blocking intent, priority, behavior, compatibility, risk, or external
actions. Inspect repository facts yourself. When needed, ask one concise round
of up to four high-leverage questions with recommendations; ask a second round
only for a remaining blocker. Record low-risk assumptions.

A ready spec exposes a concrete goal, bounded scope, observable acceptance,
smallest approach, meaningful risks, testing decision, validation, and initial
review focus covering the ticket-relevant surface. Do not turn specification
into a documentation project or pursue speculative requirements.
