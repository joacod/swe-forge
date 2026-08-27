# Adding an Agent

Keep the role catalog small. Add a role only when repeated tickets show a
bounded specialization improves correctness, verification, or cost.

## Need

Use an existing role or the orchestrator unless the new output is independently
evaluable and needs distinct responsibility or permissions. Do not add a role
for a one-off preference, vendor feature, tightly coupled task, speculative
security/performance concern, or unevaluable output. Prefer a policy or
workflow clarification when no new contract is needed.

## Portable role

Create `.swe-forge/agents/<role-name>.md` as harness-neutral Markdown without
frontmatter, provider IDs, command syntax, or vendor permissions. State:

```markdown
# Role Name

## Mission
<one bounded purpose>

## Invocation
<when useful and when not>

## Permissions
<read-only by default or explicit write conditions>

## Responsibilities
- <evidence-producing responsibility>
- <bounded action>

## Constraints
- <scope boundary>
- <failure or escalation boundary>

## Output
<structured result or review contract and required evidence>
```

Say what the role owns, forbids, and how the root evaluates its result.

## Projection

Keep native bridges under the target adapter. They load the portable role and
select host permissions; they do not copy its body or require a vendor model.
Use read-only defaults for research, architecture, review, security, and
performance. A writable role needs one bounded task contract and reports all
touched files and validation.
