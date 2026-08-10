# Adding an Agent

The role catalog should stay small. Add a role only when repeated tickets show
that a bounded specialization improves correctness, verification, or cost.

## Decide Whether a Role Is Needed

Before adding a role, check whether an existing role or the orchestrator can
handle the work. Do not add a role for:

- a one-off preference
- a vendor-specific feature
- a task that is already tightly coupled to implementation
- a speculative security or performance concern
- a role whose output cannot be independently evaluated

Prefer a policy or workflow clarification when no distinct permission,
responsibility, or output contract is needed.

## Portable Role File

Create `.swe-forge/agents/<role-name>.md` as harness-neutral Markdown. Do not
add YAML frontmatter, provider model IDs, command syntax, or vendor permissions.

Use this structure:

```markdown
# Role Name

## Mission
<one bounded purpose>

## Invocation
<when the role is useful and when it is not>

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

The role must say what it owns, what it must not do, and how the orchestrator
can evaluate its result.

## Permission Defaults

Use read-only defaults for research, architecture, review, security, and
performance roles. A writable role must receive one bounded task contract and
must report all touched files and validation.

## Harness Projection

Add native bridges only under the appropriate adapter. A bridge should load the
portable role file and select harness-specific permissions. It must not copy the
role body or make a vendor model mandatory.

## Evaluation

Record why the role was invoked in examples or evaluation data. Compare tickets
with and without the role. Retire or simplify roles that add calls and context
without improving measured outcomes.
