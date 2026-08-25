# OMP Adapter

OMP (Oh My Pi) is an experimental SWE Forge adapter. It provides a native
user-level prompt-template entry point while the canonical workflow remains in
`AGENTS.md`, `SWE-FORGE.md`, and `.swe-forge/`. Projection and installer
fixtures do not establish feature parity or real harness validation.

## Installation

Install the source-linked bridge explicitly:

```bash
scripts/swe-forge install omp
scripts/swe-forge verify omp
```

The installer creates or links:

```text
~/.omp/agent/prompts/swe-forge.md
~/.omp/agent/swe-forge/
```

The prompt reads canonical files from `~/.omp/agent/swe-forge/`, never from a
project-local `.swe-forge/` tree. The support tree is linked to the stable SWE
Forge checkout, so reviewed source updates are available to future OMP
sessions. The installer does not modify OMP's settings, providers, models,
credentials, permissions, or project configuration.

OMP itself is installed separately using the official OMP instructions. The
SWE Forge installer only installs this user-level projection.

## Explicit invocation

OMP discovers user prompt templates under `~/.omp/agent/prompts/**/*.md`.
After installation, start a new OMP session and invoke:

```text
/swe-forge <ticket>
/swe-forge pr <ticket>
```

The template uses OMP's `$ARGUMENTS` expansion and remains a thin loader. OMP
prompt templates expose the parsed argument text rather than a verified
pre-agent raw-argv hook, so the canonical ticket bootstrap remains responsible
for invoking `~/.omp/agent/swe-forge/.swe-forge/tools/swe-forge-invocation`
exactly once and normalizing the request. Ordinary OMP prompts do not activate
SWE Forge.

Prompt templates are read at session startup. Exit and restart OMP after
changing the installed projection; `/reload-plugins` does not reload prompt
templates.

## Capabilities and fallbacks

- OMP automatically discovers project `AGENTS.md` files and supports native
  context files, skills, prompt templates, user/project configuration, and
  model selection. The adapter uses a prompt template because `/swe-forge`
  gives the explicit activation contract a direct, discoverable entry point.
- OMP supports user subagents under `~/.omp/agent/agents/` and task isolation
  through its task settings. Its documented default is shared checkout work;
  isolation must be explicitly configured and requires a Git repository.
  This adapter does not claim a verified SWE Forge `NATIVE` worker provider or
  structured-result bridge. Canonical routing therefore falls back to
  `SOLO`/sequential work unless the required capabilities are demonstrated at
  runtime.
- OMP subagents are headless and cannot answer interactive approval prompts.
  Keep delegated assignments bounded and use OMP's approval policy deliberately;
  the SWE Forge workflow never treats a harness approval default as delivery
  authorization.
- OMP exposes model selection through `/model`, `--model`, and configurable
  model roles. No provider, model, or reasoning mapping is hardcoded here.
- OMP has resumable sessions and native compaction, but this adapter has no
  SWE Forge lifecycle bridge for context telemetry, state reinjection, or
  proactive compaction. Those capabilities remain unknown to the canonical
  workflow and use its durable-checkpoint/manual-recovery fallback.

Project-specific `.omp/` settings are an OMP concern and are separate from
SWE Forge installation. Do not copy the canonical support tree into a project.

## References

The adapter follows the current OMP documentation checked on 2026-08-25:

- https://omp.sh/docs/quickstart
- https://omp.sh/docs/context-files
- https://omp.sh/docs/prompt-templates
- https://omp.sh/docs/skills
- https://omp.sh/docs/settings
- https://omp.sh/docs/approvals
- https://omp.sh/docs/subagents
- https://omp.sh/docs/subagent-authoring
- https://omp.sh/docs/providers
- https://omp.sh/docs/cli

The observed local OMP CLI is `18.0.4`. This adapter has installer and
projection fixture coverage; real SWE Forge execution through OMP remains
unvalidated in the current compatibility snapshot.
