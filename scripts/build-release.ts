import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  buildStandalone,
  supportedStandaloneTargets,
  type StandaloneTarget,
} from "./build-standalone";

interface TargetMetadata {
  readonly platform: "darwin" | "linux";
  readonly architecture: "arm64" | "x64";
  readonly libc?: "glibc";
}

interface BuildOptions {
  readonly targets: readonly StandaloneTarget[];
  readonly outputRoot: string;
  readonly allowDirty: boolean;
}

interface ArtifactMetadata {
  readonly schema: "swe-forge-release-artifact/v1";
  readonly version: string;
  readonly tag: string;
  readonly target: StandaloneTarget;
  readonly platform: TargetMetadata["platform"];
  readonly architecture: TargetMetadata["architecture"];
  readonly libc?: TargetMetadata["libc"];
  readonly bun_version: string;
  readonly source_commit: string;
  readonly source_tree: "clean" | "dirty-development";
  readonly artifact: string;
  readonly sha256: string;
  readonly payload_sha256: string;
  readonly asset_count: number;
  readonly runtime_verified: boolean;
}

const root = resolve(import.meta.dir, "..");
const targetMetadata: Readonly<Record<StandaloneTarget, TargetMetadata>> = {
  "bun-darwin-arm64": { platform: "darwin", architecture: "arm64" },
  "bun-linux-x64": { platform: "linux", architecture: "x64", libc: "glibc" },
};

function fail(message: string): never {
  throw new Error(`release build: ${message}`);
}

function versionFromFile(): string {
  const version = readFileSync(join(root, "VERSION"), "utf8").split("\n")[0] ?? "";
  if (version.length === 0 || version.endsWith("\r")) fail("VERSION must have a non-empty first line");
  return version;
}

function nativeTarget(): StandaloneTarget | undefined {
  const target = `bun-${process.platform}-${process.arch}`;
  return (supportedStandaloneTargets as readonly string[]).includes(target)
    ? (target as StandaloneTarget)
    : undefined;
}

function sourceCommit(): string {
  const result = Bun.spawnSync(["git", "-C", root, "rev-parse", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) fail("could not determine source commit");
  const commit = new TextDecoder().decode(result.stdout).trim();
  if (commit.length === 0) fail("source commit is empty");
  return commit;
}

function assertCleanCheckout(): void {
  const result = Bun.spawnSync(["git", "-C", root, "status", "--porcelain=v1", "--untracked-files=all"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) fail("could not inspect checkout state");
  if (new TextDecoder().decode(result.stdout).length !== 0) {
    fail("release artifact build requires a clean checkout; use --allow-dirty only for local development");
  }
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseTarget(value: string): StandaloneTarget {
  if (!(supportedStandaloneTargets as readonly string[]).includes(value)) {
    fail(`unsupported target: ${value}; supported targets: ${supportedStandaloneTargets.join(", ")}`);
  }
  return value as StandaloneTarget;
}

function parseArguments(args: readonly string[]): BuildOptions | "help" {
  const targets: StandaloneTarget[] = [];
  let outputRoot = join(root, "build", "releases");
  let allowDirty = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "-h" || argument === "--help") return "help";
    if (argument === "--allow-dirty") {
      allowDirty = true;
      continue;
    }
    if (argument === "--target") {
      const value = args[index + 1];
      if (value === undefined) fail("--target requires a Bun target");
      targets.push(parseTarget(value));
      index += 1;
      continue;
    }
    if (argument.startsWith("--target=")) {
      targets.push(parseTarget(argument.slice("--target=".length)));
      continue;
    }
    if (argument === "--outdir") {
      const value = args[index + 1];
      if (value === undefined) fail("--outdir requires a directory");
      outputRoot = resolve(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--outdir=")) {
      outputRoot = resolve(argument.slice("--outdir=".length));
      continue;
    }
    fail(`unknown option: ${argument}`);
  }

  const selected = targets.length === 0 ? [nativeTarget()] : targets;
  if (selected[0] === undefined) {
    fail(`host ${process.platform}-${process.arch} is not a supported release target; pass --target explicitly`);
  }
  const uniqueTargets = [...new Set(selected)] as StandaloneTarget[];
  return { targets: uniqueTargets, outputRoot, allowDirty };
}

function usage(): void {
  process.stdout.write(`Usage:\n  bun run scripts/build-release.ts [options]\n\nOptions:\n  --target TARGET       Build a supported target (repeatable).\n  --outdir DIRECTORY    Root for generated release artifacts.\n  --allow-dirty         Permit a dirty checkout for local development only.\n\nSupported targets:\n  ${supportedStandaloneTargets.join("\n  ")}\n`);
}

async function buildArtifact(version: string, commit: string, options: BuildOptions, target: StandaloneTarget): Promise<void> {
  const metadata = targetMetadata[target];
  const versionDirectory = join(options.outputRoot, `v${version}`);
  const artifactName = `swe-forge-v${version}-${metadata.platform}-${metadata.architecture}`;
  const artifactPath = join(versionDirectory, artifactName);
  mkdirSync(versionDirectory, { recursive: true });

  const hostTarget = nativeTarget();
  const built = await buildStandalone({
    outputPath: artifactPath,
    target,
    verify: target === hostTarget,
  });
  const artifactSha256 = sha256(artifactPath);
  const artifactMetadata: ArtifactMetadata = {
    schema: "swe-forge-release-artifact/v1",
    version,
    tag: `v${version}`,
    target,
    platform: metadata.platform,
    architecture: metadata.architecture,
    ...(metadata.libc === undefined ? {} : { libc: metadata.libc }),
    bun_version: Bun.version,
    source_commit: commit,
    source_tree: options.allowDirty ? "dirty-development" : "clean",
    artifact: basename(artifactPath),
    sha256: artifactSha256,
    payload_sha256: built.payloadSha256,
    asset_count: built.assets.length,
    runtime_verified: target === hostTarget,
  };
  writeFileSync(`${artifactPath}.sha256`, `${artifactSha256}  ${basename(artifactPath)}\n`);
  writeFileSync(`${artifactPath}.json`, `${JSON.stringify(artifactMetadata, null, 2)}\n`);
  process.stdout.write(`Artifact: ${artifactPath}\n`);
  process.stdout.write(`SHA-256: ${artifactSha256}\n`);
  process.stdout.write(`Payload SHA-256: ${built.payloadSha256}\n`);
  process.stdout.write(`Runtime verification: ${artifactMetadata.runtime_verified ? "passed" : "not run (cross-target)"}\n`);
}

async function main(args: readonly string[]): Promise<number> {
  const parsed = parseArguments(args);
  if (parsed === "help") {
    usage();
    return 0;
  }
  if (!parsed.allowDirty) assertCleanCheckout();
  const version = versionFromFile();
  const commit = sourceCommit();
  for (const target of parsed.targets) await buildArtifact(version, commit, parsed, target);
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
