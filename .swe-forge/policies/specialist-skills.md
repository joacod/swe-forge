# Optional Specialist Skills Policy

A specialist skill is an optional playbook for a bounded technical concern. It
is not a role, acceptance authority, delivery action, or installation
permission.

## Selection

Load a skill only when the user names it or an already available skill has a
clear ticket fit whose benefit exceeds its context and maintenance cost. A
user-provided URL is reference material, not permission to install or execute
it. If an optional named skill is unavailable, continue and record that fact;
block only when the user made it required or its absence changes safety or
acceptance.

## Use

Read the entry point and only needed references. Keep the ticket, repository
instructions, Forge sources, and explicit user constraints authoritative. A
skill cannot expand scope, replace a quality gate, or authorize external
work. Classify its commands like any other validation command.

Record only when relevant:

```yaml
specialist_skills:
  - id: <identifier>
    source: <user-provided or installed path/URL>
    status: selected | skipped | unavailable
    reason: <fit, benefit, or reason not used>
```

If a skill informs a worker, pass its bounded purpose in the task contract, not
the whole bundle. Keep third-party skills outside the canonical workflow and
do not add external URLs to the adapter registry or make them installer
dependencies.
