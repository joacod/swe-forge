# Adding a Harness

Add a harness adapter only when the harness provides a feature that improves
discovery, explicit invocation, delegation, permissions, isolation, or model
routing. Natural-language activation through `AGENTS.md` is always the
fallback.

## Research Current Documentation

Before writing adapter files, verify the harness's current official guidance
for:

- instruction-file discovery and precedence
- project and global locations
- custom commands or slash commands
- skills or reusable instruction support
- native subagents, background workers, or teams
- permission and tool restrictions
- model selection and capability mapping
- worktree or session isolation
- how external orchestration can launch the harness

Record the documentation links and date in the adapter README. Do not rely on
old examples or infer undocumented paths.

## Adapter Contents

Use `.swe-forge/adapters/<harness>/` for:

- a short discovery and installation README
- an explicit command or skill loader when supported
- a source-linked global loader when the harness has a documented user scope
- optional thin native role bridges
- permission and model mapping guidance
- isolation and fallback notes
- validation steps

Keep the adapter smaller than the canonical workflow. A loader should say which
canonical files to read, not reproduce their procedure.

## Activation

Any command, skill, or native feature must preserve the mandatory explicit
activation contract. It must not activate because a ticket is complex or the
repository contains SWE Forge.

If the harness cannot enforce user-only invocation, prefer documenting the
natural-language path instead of shipping an auto-discoverable loader that
could violate opt-in behavior.

## Native Roles

When native role registration is useful:

- point the native prompt at one file under `.swe-forge/agents/`
- set read-only permissions for research and review roles
- grant write tools only to bounded implementation tasks
- leave model selection configurable
- require the portable result or review contract in the output

Do not copy portable role instructions into native definitions.

## Validation

Test an adapter in a disposable project or controlled fixture:

1. ordinary prompt does not activate Forge
2. explicit natural-language invocation loads the canonical workflow
3. native command or skill loads only when explicitly invoked
4. role bridges resolve the canonical files
5. permissions match the role's intended access
6. model mappings contain no hardcoded private configuration
7. unavailable optional tooling falls back cleanly
8. the repository installer can install and verify the adapter in a temporary
   project without overwriting collisions

Update the adapter when official harness behavior changes, but do not change
the canonical architecture to match one vendor's terminology.
