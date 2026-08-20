# Adding a Workflow

The repository currently implements the general ticket workflow and its
conditional isolated-execution workflow. Add another workflow only when real
tickets demonstrate that a distinct lifecycle and acceptance strategy is worth
maintaining.

## Location and Invocation

Create:

```text
.swe-forge/workflows/<workflow-name>.md
```

The universal entry point remains explicit natural language. Future adapters
may expose a command such as `/swe-forge <workflow-name>`, but the command must
load the workflow file rather than copy it.

## Required Content

A workflow should define:

- purpose and when to use it
- required inputs and original-ticket authority
- phases and decision points
- artifacts and contracts it consumes
- routing differences from the general ticket workflow
- test and verification strategy
- failure and recovery boundaries
- final acceptance gate
- concise report format

Keep the workflow proportional. Do not import product-management ceremony,
unrestricted agent conversations, or role requirements that the ticket does
not justify.

## Reuse Canonical Contracts and Policies

Reuse `.swe-forge/contracts/` for tasks, results, reviews, and run state. Reuse
`.swe-forge/policies/` for routing, delegation, model capabilities,
verification, and recovery unless the new workflow has a concrete reason to
override one of them.

If a policy must change for one workflow, document the narrower scope and keep
the general ticket behavior unchanged.

## Validate Before Ceremony

Before adding roles, commands, or persistent state, validate the workflow with
focused conformance scenarios and repository checks. Add durable ceremony only
when it protects a required behavior or safety boundary.

## Review Checklist

- activation remains explicitly user-controlled
- the original ticket remains authoritative
- `SOLO`, `SUBAGENTS`, and `ISOLATED` rules remain safe
- execution providers remain separate from topology, with Herdr optional
- concurrent writers never share a checkout
- workers return structured results with exact bases, scope, validation, and
  environment-resource evidence when isolated
- verification and fresh review are proportional and real
- adapters remain thin loaders
- examples and conformance coverage explain when the workflow should not be used
