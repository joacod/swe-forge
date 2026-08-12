# Adding An Optional Specialist Skill

SWE Forge can use domain-specific skills without making them part of the
canonical workflow. This is the right extension point for reusable guidance
that is valuable for some tickets but would add noise or maintenance cost to
ordinary work.

## Use A Skill, Role, Or Delivery Helper?

Choose the smallest extension that fits:

- **Specialist skill:** optional domain guidance, references, audits, or
  validation steps for a class of tickets.
- **Role:** a repeated workflow responsibility with bounded ownership and a
  structured result, such as independent review or security analysis.
- **Delivery helper:** one explicitly authorized repository action, such as
  `git-commit`, `git-push`, or `git-pr`.

A specialist skill must not become a new role or delivery command merely
because it has a useful prompt. Existing roles, contracts, and policies remain
the source of authority.

## Keep It Optional

A skill should be available on demand through a harness-native, explicit
invocation or an already-installed local bundle. Do not make the default SWE
Forge loader discover arbitrary skill catalogs, download remote skill bodies,
or load every specialist reference into every ticket.

When a skill is adopted, document a small descriptor containing:

```yaml
id: <stable name>
purpose: <bounded problem it helps solve>
use_when:
  - <observable ticket signal>
not_for:
  - <nearby ticket that should stay on the normal path>
source: <maintained local bundle or user-provided external source>
dependencies:
  - <references, scripts, or assets required by the entry point>
expected_output: <advice, audit, implementation, or review evidence>
```

Keep the entry point and its references together. A skill that depends on
scripts or a reference tree is a bundle, not a single Markdown file that can be
copied safely in isolation.

## Use It In A Ticket

The orchestrator should:

1. preserve the user's skill reference and inspect repository facts first
2. select the skill only when the user requested it or its declared trigger
   clearly matches and the expected benefit justifies the extra context
3. read only the entry point and material needed for the current ticket
4. record the source, selection decision, and reason in the transient working
   spec
5. keep implementation scope, validation, review, and delivery authorization
   under the normal Forge contracts

If a skill is unavailable, proceed without it when it is optional and record
the limitation. Ask for a decision when the skill is required or its absence
would change behavior, compatibility, safety, or acceptance.

Skill-provided commands are not automatically trusted validation. Inspect their
side effects and classify them before running them. A skill can recommend a
check; it cannot waive a required repository check or authorize external work.

## Examples From This Ticket

These are useful external candidates, not SWE Forge dependencies or bundled
canonical files:

- [`tdd`](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md)
  fits explicit test-first, red-green-refactor, or integration-test requests.
  Its `tests.md` and `mocking.md` references are part of the bundle and must be
  read when needed; it should not make TDD mandatory for ordinary tickets.
- [`refactor-design-patterns`](https://github.com/joacod/skills/blob/main/skills/refactor-design-patterns/SKILL.md)
  fits pattern-selection and incremental refactor design questions. It should
  be loaded only when the ticket has a real design pressure; it should not add
  pattern ceremony to a simple change.
- [`ui-design-token-refactor`](https://github.com/joacod/skills/blob/main/skills/ui-design-token-refactor/SKILL.md)
  fits UI styling, CSS, Tailwind, and design-token work. Its referenced
  architecture material and audit tooling should be treated as part of the
  bundle and used only when the repository has that surface.

The skills can later be exposed through the user's preferred harness or
selected explicitly by a ticket without changing the default workflow. They
should be promoted into a maintained Forge artifact only if representative
work demonstrates a repeatable benefit.

## Promotion Checklist

Before adding permanent files, a registry entry, a new role, or a canonical
policy, compare representative tickets with and without the skill. Look for:

- fewer requirement misses or regressions
- better targeted validation or review findings
- lower human correction cost
- acceptable context, setup, and maintenance overhead

If the evidence is not clear, keep the skill external and on demand. SWE Forge
should grow capabilities from demonstrated needs rather than accumulate
one-off prompts.
