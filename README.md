# SWE Forge

SWE Forge is an opt-in, harness-agnostic workflow that turns one focused
coding ticket into one evidence-backed, reviewable PR. It owns one writable
delivery checkout and never merges automatically.

## Use

### Standalone release executable

A compiled release executable carries the canonical workflow, adapters, and
runtime tools. It does not need a repository checkout, Bun, Node.js, or Python
to install or run the installed canonical tools:

```sh
./swe-forge install <harness>
./swe-forge verify <harness>
./swe-forge update
```

`install` validates the embedded payload, publishes its immutable version under
the XDG data root (or `$HOME/.local/share`), activates the global
`swe-forge/current` pointer, and installs the selected harness projection.
`update` activates the release represented by the running executable and
reconciles every managed harness manifest. Harness projections and manifests
always target `swe-forge/current/canonical`; they never store a direct
`versions/<version>` target.

### Source checkout

The source-checkout wrapper is intentionally checkout-oriented. It requires
Bun and delegates to the canonical TypeScript installer at
`src/install/cli.ts`:

```sh
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
scripts/swe-forge update <harness>
```

Source-checkout updates remain per-harness. They do not activate managed
standalone releases.

For artifact development, `bun run build:standalone` creates
`build/standalone/swe-forge`, a Bun executable carrying a deterministic
embedded release payload. `./swe-forge payload materialize --activate` is the
low-level payload publication command; it does not install harness projections.
`v0.1.0-alpha.1` is planned, not yet published; use a development checkout
until the separate release publication task completes.

Invoke it with a ticket:

```text
/swe-forge <ticket>
```

PR delivery and automatic topology are the defaults. Use `guided` when a human
pause is wanted:

```text
/swe-forge guided <ticket>
```

Forge adds proportional validation and one fresh review when warranted. Human
PR review remains the final boundary.

## Details

- [Workflow specification](SWE-FORGE.md)
- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Harness compatibility](docs/compatibility.md)
- [Adapter reference](.swe-forge/adapters/README.md)
- [Contributing](CONTRIBUTING.md)
