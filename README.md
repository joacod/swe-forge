# SWE Forge

SWE Forge is an opt-in, harness-agnostic workflow that turns one focused
coding ticket into one evidence-backed, reviewable PR. It owns one writable
delivery checkout and never merges automatically.

## Use

Install a harness projection from a stable checkout:

```sh
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
```

The source-checkout wrapper requires Bun and delegates to the canonical
TypeScript installer at `src/install/cli.ts`.

For artifact development, `bun run build:standalone` creates
`build/standalone/swe-forge`, a Bun executable carrying a deterministic embedded
release payload. Run `build/standalone/swe-forge payload inspect` to inspect its
embedded paths. It is not yet the public installation path: source-checkout
installation remains authoritative. `v0.1.0-alpha.1` is planned, not yet
published; use a development checkout until then.

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
