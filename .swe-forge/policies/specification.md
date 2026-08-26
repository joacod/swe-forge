# Lightweight Specification Policy

## Objective

Give an agent enough shared understanding to implement safely without turning
every ticket into a persistent specification project. The working spec is
transient, behavior-first, and proportional to the selected delivery mode. The
default invocation uses `PR`; an explicit `guided` token selects `GUIDED`.

## Early Scope Decision

After enough lightweight, root-owned repository discovery to understand the
requested outcomes and likely affected surfaces, and before broad discovery or
specification, the root/orchestrator makes one transient semantic decision:

```text
scope_decision: PROCEED | TOO_BROAD
```

Use this question rather than a size estimate:

> Can this request reasonably produce one cohesive reviewable PR with one
> primary outcome and a bounded implementation surface?

`PROCEED` means yes. Substantial work, many files, and several ordered
implementation steps are allowed when they serve one cohesive outcome. Prompt
length, file count, and estimated effort are not rejection criteria.

`TOO_BROAD` means the request is an epic, combines multiple independently
implementable improvements, is an open-ended rewrite, or should obviously be
split into multiple tickets. It is a semantic judgment, not a score or a
second topology decision.

For `TOO_BROAD`, do not build a working spec or enter architecture,
decomposition, routing, validation, implementation, review, or delivery.
Return a brief explanation and suggest the major independent chunks as separate
tickets:

```text
scope_decision: TOO_BROAD
reason: <why the outcomes are independent or the request is open-ended>
submit separately:
- <major independent chunk>
- <major independent chunk>
```

For `PROCEED`, continue the normal workflow. Automatic topology selection
remains later in the lifecycle, and `PR` remains the normal/default delivery
path. Do not add this transient decision to run state, task contracts, worker
briefings, or routing records.

## When It Runs

- The early scope decision runs after lightweight root-owned discovery and
  before broad discovery, specification, decomposition, routing, validation,
  implementation, review, or delivery.
- `GUIDED` mode derives acceptance criteria during guided ingest and asks only
  blocking questions. Do not add an interview for a clear, low-risk ticket.
- `PR` mode always builds a working spec before writable implementation. It may
  skip the interview when the ticket already contains a concrete intent,
  bounded scope, observable behavior, non-goals, and validation expectations.
  The spec also records an initial `review_focus` with one review goal, every
  ticket-relevant acceptance criterion, relevant architecture decisions and
  constraints, quality concerns, non-goals, and a rule for separating
  actionable findings from deferred follow-ups. A focused repair context is
  derived transiently after a concrete repairable finding; it contains only the
  finding, repair delta, directly affected criteria, and affected checks.
- Any mode may pause for a decision when an ambiguity changes behavior, scope,
  compatibility, safety, or delivery authorization.

## Repository Facts Versus User Decisions

The agent must inspect the repository, tools, existing conventions, and
quality gates itself. Do not ask the user for facts that can be discovered
locally or from explicitly supplied references.

Ask the user for decisions about intent, priorities, user-visible behavior,
non-goals, compatibility choices, risk tolerance, or external actions. Label
facts, assumptions, and decisions separately in the working spec.

## Brief Alignment Interview

When `PR` mode needs clarification:

1. Read the ticket and relevant repository evidence first.
2. Ask one concise round of up to four high-leverage questions. Each question
   must include a recommended answer and choices when choices are useful.
3. Ask only questions whose answers would change the implementation, acceptance
   gate, scope, or authorized delivery actions. Combine independent questions
   in the same round.
4. Recompute the remaining unknowns after the answers. Ask one short follow-up
   round only when a high-risk or blocking decision remains.
5. Stop when the working spec is implementable. Do not pursue exhaustive domain
   discovery, terminology polishing, or speculative future requirements.

A question format may be:

```text
❓ Q1 — <decision>: <short context and options>
➡️ Recommendation: <the smallest safe default and why>
```

The agent may proceed with a low-risk assumption when asking would cost more
than the uncertainty. Record the assumption and its effect on acceptance. The
agent must not answer a user decision on the user's behalf merely to avoid a
question.

## Quality Bar

Before implementation, the working spec must expose:

- the intended outcome and affected users or systems
- in-scope behavior and explicit non-goals
- a small set of observable requirements and scenarios
- acceptance and validation evidence to collect
- an initial `review_focus` that names the complete ticket-relevant review
  goal, criteria, relevant constraints and quality concerns, non-goals, and
  finding boundary; a focused repair uses a transient affected subset
- compatibility, external-effect, and delivery risks
- unresolved decisions and their recovery path

The spec is a planning aid, not a second acceptance authority. Final acceptance
still compares the integrated diff and evidence to the original ticket.
