# Adding a Workflow

SWE Forge has one general ticket workflow with `SOLO` and `SUBAGENTS` choices.
Add another only when real tickets show that a distinct lifecycle and
Acceptance strategy is worth maintaining.

## Location and invocation

Create `.swe-forge/workflows/<workflow-name>.md`. The entry point remains
explicit natural language. A future adapter command must load the workflow,
not copy it.

## Required content

Define only what differs:

- purpose and use case;
- required inputs and ticket authority;
- phases and decisions;
- consumed artifacts/contracts;
- routing differences;
- testing and verification evidence for the canonical gate;
- failure/recovery boundaries; and
- workflow-specific report fields, if any.

Keep it proportional. Do not import product-management ceremony, unrestricted
agent conversation, or unjustified role requirements.

## Reuse and review

Reuse `.swe-forge/contracts/` and `.swe-forge/policies/`. Override a policy only
for a concrete workflow need and keep general ticket behavior unchanged.

Before adding roles, commands, or state, exercise focused conformance scenarios
and repository checks. Add durable ceremony only when it protects required
behavior or safety.

Preserve explicit activation, ticket authority, safe `SOLO`/`SUBAGENTS` rules,
sequential canonical writes, structured worker results, proportional evidence,
the canonical Acceptance Gate, and subordinate adapters. Document when the
workflow should not be used.
