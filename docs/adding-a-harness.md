# Adding a Harness

Add an adapter only when a harness improves discovery, explicit invocation,
delegation, permissions, isolation, or runtime integration. Natural-language
activation through `AGENTS.md` remains the fallback.

The canonical workflow owns semantics; the adapter translates host mechanisms.
Adapters may expose fewer or different capabilities with safe fallbacks. New
adapters start `Experimental`; parity with other adapters is not required.

## Research first

Check the harness's current official documentation for:

- user instruction discovery and precedence;
- commands, skills, and reusable instructions;
- native workers, teams, or background execution;
- permission and tool restrictions;
- runtime configuration and capability mapping;
- worktree/session isolation; and
- external orchestration.

Record links and the date in the adapter README. Do not infer undocumented
paths. Keep project-specific configuration as a harness concern, not another
SWE Forge installation location.

## Adapter contents

Put payloads and docs in `.swe-forge/adapters/<harness>/`. Register each
user-level projection in `.swe-forge/adapters/registry.tsv`:

```text
harness | kind | source | destination | support
```

Use `file` or `tree`; `support` is the canonical home-relative support path.
Do not add a second projection. Prefer an existing shared projection where the
harness supports that standard.

An adapter may contain a short README, explicit loader, native role/runtime
bridge, capability detection, permission mapping, isolation/fallback notes, and
validation steps. Keep it subordinate to the canonical workflow: loaders name
canonical files; bridges translate host mechanics only.

Runtime bridges consume semantic ports—state inspection/resolution,
worker-brief inspection, and worker-result schema/validation. They must not
parse or reconstruct canonical representations. Keep host profiles, allowlists,
lifecycle APIs, and native result mechanics in the adapter.

## Host primitives

When a host exposes a new primitive:

```text
new host primitive
        |
implements an existing Forge capability? -- yes -> adapter
        |
        no
        |
missing a harness-neutral contract useful elsewhere? -- yes -> smallest core contract
        |
        no -> keep it adapter-local
```

Before adding core abstraction, confirm that it:

1. expresses a missing Forge concept;
2. remains useful without the requesting harness;
3. can be implemented by another harness;
4. hides host terminology; and
5. leaves existing harness behavior unchanged.

Otherwise keep it in the adapter. Do not create a generic plugin framework.
Canonical routing still selects topology.

## Required work

1. project the workflow into the host's supported mechanism;
2. pass untouched invocation arguments to the shared parser/bootstrap;
3. declare or detect only demonstrated capabilities;
4. use canonical semantics and fallbacks; and
5. document tier and validation level honestly.

Projection/fixture checks are structural evidence, not real harness validation.
Promote a tier only with actual use and maintenance evidence. Capability
asymmetry is valid.

## Activation and roles

Commands, skills, and native features must preserve explicit user activation.
If a host cannot enforce user-only invocation, document natural-language
activation rather than shipping an auto-discoverable loader.

For native roles:

- point at one file under `.swe-forge/agents/`;
- use read-only permissions for research/review;
- grant write tools only to bounded implementation tasks;
- leave runtime selection to the host; and
- require the canonical result or review contract.

Do not copy portable role instructions into native definitions.

## Validation

Test in a temporary fake home or controlled fixture:

1. ordinary prompts do not activate Forge;
2. explicit natural-language invocation loads the canonical workflow;
3. explicit commands/skills load only when invoked;
4. role bridges resolve canonical files;
5. permissions match the role;
6. runtime configuration has no private hardcoding;
7. unavailable optional tooling falls back; and
8. install/verify do not overwrite collisions.

Record projection/fixture and real-harness validation separately. Update adapter
docs when official behavior changes, but do not change canonical architecture
for one vendor or require feature parity. The installer has one-harness-at-a-time
preflight, source-link verification, and install/verify flow; there is no
multi-harness shortcut.
