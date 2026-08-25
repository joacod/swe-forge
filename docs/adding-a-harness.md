# Adding a Harness

Add a harness adapter only when the harness provides a feature that improves
discovery, explicit invocation, delegation, permissions, isolation, or model
routing. Natural-language activation through `AGENTS.md` is always the
fallback.

SWE Forge is harness-agnostic: the canonical workflow owns semantics and an
adapter translates them onto the host's native mechanisms. Adapters may expose
a smaller or different capability set with safe canonical fallbacks. A new
adapter starts as Experimental by default; it does not need to reproduce every
other adapter's capabilities before it can be useful.

## Research Current Documentation

Before writing adapter files, verify the harness's current official guidance
for:

- user-level instruction-file discovery and precedence
- custom commands or slash commands
- skills or reusable instruction support
- native subagents, background workers, or teams
- permission and tool restrictions
- model selection and capability mapping
- worktree or session isolation
- how external orchestration can launch the harness

A harness may also support project-specific configuration; document that as a
harness concern, not as another SWE Forge installation location.

Record the documentation links and date in the adapter README. Do not rely on
old examples or infer undocumented paths.

## Adapter Contents

Use `.swe-forge/adapters/<harness>/` for harness-specific documentation and
payloads. Register installable artifacts in
`.swe-forge/adapters/registry.tsv` instead of adding harness branches to the
installer. Each registry row declares the one user-level projection:

```text
harness | kind | source | destination | support
```

Use `file` or `tree` for `kind`. `support` is the canonical support directory
under the user's home. Do not add a second installation projection; harness
project-specific configuration belongs outside this registry.

Prefer an existing shared projection when the harness supports the same
standard. For example, Codex and Cursor use the shared Agent Skill payload in
`.swe-forge/adapters/shared/agent-skill/`; their adapter directories only
provide compatibility documentation.

An adapter may still contain:

- a short discovery and installation README
- an explicit command, skill, or prompt loader
- optional native role or runtime bridges
- capability detection and worker-profile mapping
- permission and model mapping guidance
- isolation and fallback notes
- validation steps

Keep the adapter smaller than and subordinate to the canonical workflow. A
loader should say which canonical files to read, not reproduce their procedure;
a runtime bridge may translate host mechanics when the harness needs more than
a loader.

## Decide Where a New Host Primitive Belongs

When a harness exposes a useful new primitive, use this small decision rule:

```text
A new host primitive appears
        |
        v
Does it implement an existing SWE Forge semantic capability?
        |
      yes --------------> implement it entirely in the adapter
        |
        no
        v
Does SWE Forge lack a semantic contract that is independently useful
regardless of this harness?
        |
      yes --------------> add the smallest harness-neutral contract
        |
       no ---------------> keep the behavior adapter-local
```

Canonical routing still selects the topology. An adapter does not choose a
workflow topology merely because its host exposes a native task or subagent
primitive.

Before adding a canonical abstraction, ask:

1. What SWE Forge semantic concept is missing?
2. Would the concept still make sense if the requesting harness did not exist?
3. Could another harness implement the same contract with a different
   primitive?
4. Does the abstraction avoid exposing the original host terminology?
5. Does existing harness behavior remain unchanged?

If the answers are not convincing, keep the change in the adapter. Do not turn
this decision rule into a generic plugin or extension framework.

## Required Adapter Work

Adding an adapter requires these bounded pieces, in this order:

1. project the canonical workflow into the host's supported extension mechanism;
2. forward the host's untouched invocation arguments to the shared parser/bootstrap;
3. declare or detect only capabilities the adapter actually demonstrates;
4. use canonical semantics and documented fallbacks when a capability is absent;
5. document the support tier and validation level honestly.

Projection and fixture checks are useful structural evidence, but they are not a
substitute for exercising SWE Forge through the real harness. Promote an
experimental adapter only when actual use and maintenance evidence warrant it;
do not create parity work as a prerequisite for adding an adapter.

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

The installer handles preflight, source-link verification, and
`install`/`verify` for one explicitly selected harness at a time. There is
intentionally no multi-harness install shortcut; callers can invoke the command
once per desired harness.

Test an adapter in an isolated fake home or controlled fixture:

1. ordinary prompt does not activate Forge
2. explicit natural-language invocation loads the canonical workflow
3. native command or skill loads only when explicitly invoked
4. role bridges resolve the canonical files
5. permissions match the role's intended access
6. model mappings contain no hardcoded private configuration
7. unavailable optional tooling falls back cleanly
8. the repository installer can install and verify the adapter in a temporary
   home without overwriting collisions

Record projection/fixture validation separately from real harness validation.
In particular, a successful installer or generated skill fixture does not mean
that the maintainer has behaviorally validated the harness. Update the adapter
when official harness behavior changes, but do not change the canonical
architecture to match one vendor's terminology or require feature parity with
Pi.
