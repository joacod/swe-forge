# Agent Instructions

Use the repository normally unless the user explicitly requests SWE Forge.

## SWE Forge

SWE Forge is an optional advanced software-engineering workflow defined in:

`SWE-FORGE.md`

Do not automatically load or execute SWE Forge.

Activate it only when the user explicitly:

- says "Use SWE Forge"
- says "Follow SWE Forge"
- references `SWE-FORGE.md`
- invokes a harness-specific SWE Forge command such as `/swe-forge`

When activated, read `SWE-FORGE.md` and follow the workflow it defines.

## Installation Requests

Installation is separate from workflow activation. When the user explicitly
asks to install SWE Forge for a harness, for example `install swe-forge
opencode`, read `docs/installation.md` and the requested adapter README.

- Ask where to install it when the user did not provide a repository, folder, or
  `global` scope.
- Use `scripts/swe-forge install <harness> --target <path>` for a project or
  `scripts/swe-forge install <harness> --global` for user-level harness access.
- Pi's V1 adapter is global-only: use `scripts/swe-forge install pi --global`.
- Run the matching `scripts/swe-forge verify` command after installation.
- Never modify global harness configuration unless the user explicitly chose
  `global`.
- Do not overwrite or merge conflicting instruction files without showing the
  user the conflict first.
