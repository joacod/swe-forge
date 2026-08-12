# Optional Specialist Skills Policy

## Objective

Use domain-specific instruction bundles when they improve a ticket without
making them part of every SWE Forge run. Specialist skills are an on-demand
extension point, not another mandatory workflow phase.

## What A Skill Is

A specialist skill is a reusable playbook for a bounded technical concern. It
may provide heuristics, reference material, audit steps, or domain-specific
validation guidance.

A skill is not:

- a repository instruction that overrides the ticket or project conventions
- a canonical Forge role with ownership of a task or final acceptance
- a delivery action such as `git-commit`, `git-push`, or `git-pr`
- permission to install dependencies, publish artifacts, or change shared
  environments

Use a role when the work needs a distinct responsibility and structured result.
Use a skill when optional domain guidance is useful but the existing workflow
and contracts remain sufficient.

## Selection

Load a specialist skill only when one of these conditions is true:

1. the user explicitly names or supplies the skill
2. an already available skill has a clear declared match for the ticket and
   the expected benefit outweighs its context and maintenance cost

Otherwise, do not search skill catalogs or add a skill to the run. A user-
provided URL may be evaluated as a reference, but it is not permission to
install, copy, or execute anything from that source.

When a named skill is unavailable, continue with the normal workflow if the
skill is optional and record that fact. Ask or block only when the user made it
required or its absence changes a safety, compatibility, or acceptance decision.

## Loading And Authority

- Read the skill entry point and only the referenced material needed for the
  current ticket; treat references, scripts, and assets as one bounded bundle.
- Keep the original ticket, repository instructions, canonical Forge files, and
  explicit user constraints authoritative over skill advice.
- Do not let a skill silently expand scope, replace a required quality gate, or
  authorize a delivery or external action.
- Classify any skill-provided command like any other validation command before
  running it. Do not run scripts with external, destructive, deployment, or
  publication effects without the applicable authorization.
- If skill advice changes behavior, scope, compatibility, or risk, surface the
  decision instead of treating the skill as an automatic requirement.

## Workflow Integration

Evaluate optional skills during discovery or architecture, not after an
implementation has already expanded. Record the following in the transient
working spec, or in active run state when no spec exists:

```yaml
specialist_skills:
  - id: <identifier>
    source: <user-provided or already-installed path or URL>
    status: selected | skipped | unavailable
    reason: <ticket fit and expected benefit, or why it was not used>
```

If a selected skill informs delegated work, pass its source and bounded purpose
in the task contract; do not paste an entire skill bundle into the contract.
Keep skill output subject to the same validation, review, and final acceptance
gates as any other implementation guidance.

## Extension Boundary

Keep third-party or highly domain-specific skills outside the canonical Forge
workflow by default. A harness may expose an explicitly user-invoked native
loader, but the loader must remain thin and must not make the skill a default
dependency. Do not add external skill URLs to the adapter registry or make the
installer download them.

Promote a skill into a canonical role, policy, adapter, or maintained bundle
only after representative tickets show a repeatable correctness, verification,
or cost benefit. Until then, on-demand use keeps SWE Forge extensible without
adding permanent workflow ceremony.
