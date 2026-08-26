# Adding a Workflow

The repository implements one general ticket workflow with `SOLO` and
`SUBAGENTS` execution choices. Add another workflow only when real tickets
demonstrate that a distinct lifecycle and acceptance strategy is worth
maintaining.

## Location and Invocation

Create:

```text
.swe-forge/workflows/<workflow-name>.md
```

The universal entry point remains explicit natural language. Future adapters may
expose a command such as `/swe-forge <workflow-name>`, but the command must load
the workflow file rather than copy it.

## Required Content

A workflow should define:

- purpose and when to use it;
- required inputs and original-ticket authority;
- phases and decision points;
- artifacts and contracts it consumes;
- routing differences from the general ticket workflow;
- test and verification strategy;
- failure and recovery boundaries;
- final acceptance gate; and
- concise report format.

Keep the workflow proportional. Do not import product-management ceremony,
unrestricted agent conversations, or role requirements that the ticket does not
justify.

## Reuse Canonical Contracts and Policies

Reuse `.swe-forge/contracts/` for tasks, results, reviews, and run state.
Reuse `.swe-forge/policies/` for routing, delegation, verification, and
recovery unless the new workflow has a concrete reason to override one of them.

If a policy must change for one workflow, document the narrower scope and keep
general ticket behavior unchanged.

## Validate Before Ceremony

Before adding roles, commands, or persistent state, validate the workflow with
focused conformance scenarios and repository checks. Add durable ceremony only
when it protects a required behavior or safety boundary.

## Review Checklist

- activation remains explicitly user-controlled;
- the original ticket remains authoritative;
- `SOLO` and `SUBAGENTS` rules remain safe;
- concurrent writers never modify the canonical delivery candidate at once;
- workers return structured results with canonical delivery identity, scope, and
  validation evidence; physical worker execution details are host-private;
- verification and fresh review are proportional and real;
- adapters remain subordinate integration layers and do not redefine canonical
  workflow semantics; and
- examples and conformance coverage explain when the workflow should not be used.
