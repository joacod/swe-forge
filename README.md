# SWE Forge

SWE Forge is an opt-in, harness-agnostic workflow that takes one focused
coding ticket to one evidence-backed, reviewable outcome. It owns one writable
delivery checkout and never merges automatically.

## Install

### Standalone executable

Release executables carry the canonical workflow, adapters, and portable tools.
They need no repository checkout, Bun, Node.js, or Python at runtime:

```sh
./swe-forge --version
./swe-forge install <harness>
./swe-forge verify <harness>
./swe-forge update
```

`install` validates the embedded payload, stores its immutable version under the
user data root, activates the global `swe-forge/current` release, and installs
one harness projection. `update` activates the release in the running
executable and reconciles every managed harness. It never downloads a release
or updates over the network.

The release flow targets macOS arm64 and Linux x64 (glibc); an artifact is
distributable only after its native clean-room gate passes. Windows and other
architectures are not claimed.

### Source-checkout developer mode

The checkout wrapper requires Bun and runs the reviewed TypeScript source:

```sh
scripts/swe-forge install <harness>
scripts/swe-forge verify <harness>
scripts/swe-forge update <harness>
```

Checkout updates are per-harness and do not activate managed standalone
releases. Runtime package dependencies remain zero.

### Bun global package

Package metadata is prepared for a future `bun add --global swe-forge` install.
That entry point intentionally runs source-checkout mode and therefore requires
Bun; standalone executables do not. This step does not publish the package.

## Develop

Maintainers need Bun for tests, validation, and builds:

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run build:release -- --target bun-darwin-arm64 --allow-dirty
```

Release artifacts include a versioned filename, embedded payload identity, and
SHA-256 sidecar. Run the clean-room check against the generated artifact before
manual publication.

Invoke Forge with a ticket:

```text
/swe-forge <ticket>
/swe-forge guided <ticket>
```

## Details

- [Workflow specification](SWE-FORGE.md)
- [Architecture](docs/architecture.md)
- [Installation](docs/installation.md)
- [Harness compatibility](docs/compatibility.md)
- [Adapter reference](.swe-forge/adapters/README.md)
- [Contributing](CONTRIBUTING.md)
