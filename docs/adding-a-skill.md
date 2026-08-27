# Adding an Optional Specialist Skill

Use a specialist skill for reusable guidance that helps a class of tickets but
would add noise or maintenance cost to ordinary work. It is optional and never
changes canonical authority.

## Choose the extension

- **Skill:** optional domain guidance, references, audits, or checks.
- **Role:** repeated responsibility with bounded ownership and structured result.
- **Delivery helper:** one explicitly authorized action such as `git-commit`,
  `git-push`, or `git-pr`.

Do not turn a useful prompt into a role or command. Existing roles, contracts,
and policies remain authoritative.

## Keep it optional

Expose a skill only through explicit invocation or an installed local bundle.
Do not make the default loader discover catalogs, download bodies, or load every
reference. Keep the entry point and required references together.

Document:

```yaml
id: <stable name>
purpose: <bounded problem>
use_when:
  - <observable ticket signal>
not_for:
  - <nearby ticket for the normal path>
source: <maintained local bundle or user-provided source>
dependencies:
  - <references, scripts, or assets>
expected_output: <advice, audit, implementation, or review evidence>
```

## Use in a ticket

1. preserve the user's reference and inspect the repository first;
2. select only on user request or a clear declared trigger whose benefit exceeds
   context cost;
3. read only the entry point and needed references;
4. record source, decision, and reason in the transient spec; and
5. keep scope, validation, review, and delivery under normal Forge contracts.

If an optional skill is unavailable, continue and record the limitation. Ask
only when it is required or its absence changes behavior, compatibility, safety,
or acceptance. Inspect and classify skill-command side effects before use; a
skill cannot waive checks or authorize external work.

## Promotion

Before adding a permanent file, registry entry, role, or policy, compare real
representative tickets with and without the skill. Promote only when it reduces
misses or human correction, improves evidence/review, and justifies context,
setup, and maintenance cost. Otherwise keep it external and on demand.
