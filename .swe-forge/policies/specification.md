# Lightweight Specification Policy

## Objective

Give an agent enough shared understanding to implement safely without turning
every ticket into a persistent specification project. The working spec is
transient, behavior-first, and proportional to the selected delivery mode. The
default invocation uses `PR`; an explicit `guided` token selects `GUIDED`.

## When It Runs

- `GUIDED` mode derives acceptance criteria during guided ingest and asks only
  blocking questions. Do not add an interview for a clear, low-risk ticket.
- `PR` mode always builds a working spec before writable implementation. It may
  skip the interview when the ticket already contains a concrete intent,
  bounded scope, observable behavior, non-goals, and validation expectations.
  The spec also records an initial `review_focus` with one review goal, every
  ticket-relevant acceptance criterion, relevant architecture decisions and
  constraints, quality concerns, non-goals, and a rule for separating
  actionable findings from deferred follow-ups. A focused subset is derived transiently after a
  repair; it contains only the prior blockers, repair delta, and directly
  affected criteria and risks.
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
  finding boundary; a focused re-review uses a transient affected subset
- compatibility, external-effect, and delivery risks
- unresolved decisions and their recovery path

The spec is a planning aid, not a second acceptance authority. Final acceptance
still compares the integrated diff and evidence to the original ticket.
