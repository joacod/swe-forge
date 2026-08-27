import { readFileSync, statSync, type Stats } from "node:fs";
import { join, resolve } from "node:path";
import { enumerateReleasePayload } from "./generate-standalone-assets";
import { payloadIdentity } from "../src/distribution/embedded-payload";

interface PackageMetadata {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly private?: unknown;
  readonly bin?: unknown;
  readonly files?: unknown;
  readonly engines?: unknown;
  readonly dependencies?: unknown;
  readonly optionalDependencies?: unknown;
  readonly peerDependencies?: unknown;
  readonly trustedDependencies?: unknown;
  readonly scripts?: unknown;
}

const root = resolve(import.meta.dir, "..");
const versionPath = join(root, "VERSION");
const version = readFileSync(versionPath, "utf8").split("\n")[0] ?? "";
const tag = `v${version}`;
const notesPath = join(root, "docs", "releases", `${tag}.md`);

function fail(message: string): never {
  throw new Error(`release check failure: ${message}`);
}

function requireFile(path: string, label: string): void {
  let stats: Stats;
  try {
    stats = statSync(path);
  } catch {
    fail(`${label} is missing: ${path}`);
  }
  if (!stats.isFile()) fail(`${label} is not a regular file: ${path}`);
}

function requireText(relativePath: string, text: string): void {
  const path = join(root, relativePath);
  requireFile(path, "required release file");
  if (!readFileSync(path, "utf8").includes(text)) fail(`${relativePath} is missing: ${text}`);
}

function packageMetadata(): PackageMetadata {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageMetadata;
  } catch (error) {
    fail(`package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validatePackage(): void {
  const packageJson = packageMetadata();
  if (packageJson.name !== "swe-forge") fail("package name is not swe-forge");
  if (packageJson.version !== version) fail("package version does not match VERSION");
  if (packageJson.private === true) fail("package metadata is still private");
  const bin = packageJson.bin;
  if (
    typeof bin !== "object" ||
    bin === null ||
    (bin as Record<string, unknown>)["swe-forge"] !== "scripts/swe-forge"
  ) {
    fail("package bin does not expose scripts/swe-forge");
  }
  const engines = packageJson.engines;
  if (
    typeof engines !== "object" ||
    engines === null ||
    (engines as Record<string, unknown>).bun !== ">=1.4.0"
  ) {
    fail("package metadata does not declare Bun >=1.4.0");
  }
  const files = Array.isArray(packageJson.files) ? packageJson.files : [];
  const requiredFiles = [
    "AGENTS.md",
    "SWE-FORGE.md",
    "VERSION",
    ".swe-forge/agents/",
    ".swe-forge/conformance/",
    ".swe-forge/contracts/",
    ".swe-forge/examples/",
    ".swe-forge/policies/",
    ".swe-forge/tools/",
    ".swe-forge/workflows/",
    ".swe-forge/adapters/registry.tsv",
    ".swe-forge/adapters/claude-code/skills/swe-forge/",
    ".swe-forge/adapters/omp/agents/",
    ".swe-forge/adapters/omp/extensions/swe-forge-runtime.ts",
    ".swe-forge/adapters/omp/prompts/swe-forge.md",
    ".swe-forge/adapters/opencode/commands/",
    ".swe-forge/adapters/pi/extensions/swe-forge-runtime.ts",
    ".swe-forge/adapters/pi/prompts/",
    ".swe-forge/adapters/shared/agent-skill/swe-forge/",
    "src/",
    "scripts/swe-forge",
  ];
  for (const required of requiredFiles) {
    if (!files.includes(required)) fail(`package files is missing ${required}`);
  }
  const restricted = ["dependencies", "optionalDependencies", "peerDependencies", "trustedDependencies"] as const;
  for (const field of restricted) {
    if (Object.prototype.hasOwnProperty.call(packageJson, field)) fail(`package.json defines runtime dependency field ${field}`);
  }
  const scripts = packageJson.scripts;
  if (typeof scripts === "object" && scripts !== null) {
    for (const lifecycle of ["preinstall", "install", "postinstall"]) {
      if (Object.hasOwn(scripts, lifecycle)) fail(`package.json defines forbidden lifecycle script ${lifecycle}`);
    }
  }
}

function runGit(args: readonly string[]): { readonly exitCode: number; readonly stdout: string; readonly stderr: string } {
  const result = Bun.spawnSync(["git", "-C", root, ...args], { stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function validateConsistency(): { readonly assetCount: number; readonly payloadSha256: string } {
  if (version.length === 0 || version.endsWith("\r") || !version.includes(".")) fail("VERSION is not a release version");
  requireText("CHANGELOG.md", version);
  requireText("README.md", "bun run build:release");
  requireText("README.md", "./swe-forge install");
  requireText("docs/compatibility.md", "payload SHA-256");
  requireText("docs/installation.md", "current/canonical");
  requireText("docs/installation.md", "bun-linux-x64");
  requireText(`docs/releases/${tag}.md`, `# SWE Forge ${tag}`);
  const notes = readFileSync(notesPath, "utf8");
  if (notes.includes("git clone")) fail("release notes put a standalone user on a repository clone");
  validatePackage();

  const assets = enumerateReleasePayload(root);
  if (assets.length === 0) fail("canonical release inventory is empty");
  const payloadSha256 = payloadIdentity(
    assets.map((asset) => ({
      path: asset.path,
      bytes: new Uint8Array(readFileSync(asset.sourcePath)),
      mode: asset.mode,
    })),
  );
  return { assetCount: assets.length, payloadSha256 };
}

function assertClean(): void {
  const result = runGit(["status", "--porcelain=v1", "--untracked-files=all"]);
  if (result.exitCode !== 0) fail(`could not inspect checkout state: ${result.stderr.trim()}`);
  if (result.stdout.length !== 0) fail("release candidate checkout is not clean");
}

function prepare(allowDirty: boolean): void {
  const consistency = validateConsistency();
  if (!allowDirty) assertClean();
  process.stdout.write(`PASS: release readiness prepared for ${tag}\n`);
  process.stdout.write(`Canonical release assets: ${consistency.assetCount}\n`);
  process.stdout.write(`Embedded payload SHA-256: ${consistency.payloadSha256}\n`);
  process.stdout.write("Publication remains manual; no tag or release was created.\n");
}

function published(): void {
  prepare(true);
  const local = runGit(["rev-parse", "--verify", `refs/tags/${tag}`]);
  const remote = Bun.spawnSync(["git", "-C", root, "ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const localCommit = local.exitCode === 0 ? local.stdout.trim() : "";
  const remoteOutput = new TextDecoder().decode(remote.stdout).trim();
  if (localCommit.length === 0 && remoteOutput.length === 0) fail(`expected tag evidence is absent: ${tag}`);
  const head = runGit(["rev-parse", "HEAD"]).stdout.trim();
  if (localCommit.length > 0) {
    const tagCommit = runGit(["rev-list", "-n", "1", tag]).stdout.trim();
    if (tagCommit !== head) fail("local tag does not resolve to current release commit");
  }
  if (remoteOutput.length > 0) {
    const remoteCommit = remoteOutput.split("\n").find((line) => line.endsWith("{}"))?.split("\t")[0] ?? remoteOutput.split("\n")[0]?.split("\t")[0];
    if (remoteCommit !== head) fail("remote tag evidence does not resolve to current release commit");
  }
  process.stdout.write(`PASS: published tag evidence resolves for ${tag}\n`);
  process.stdout.write("Release publication remains a separate manual action.\n");
}

function usage(): void {
  process.stdout.write(`Usage:\n  scripts/check-release prepare [--allow-dirty]\n  scripts/check-release published\n`);
}

try {
  const [command, option] = process.argv.slice(2);
  if (command === "-h" || command === "--help") {
    usage();
    process.exitCode = 0;
  } else if (command === "prepare" && (option === undefined || option === "--allow-dirty")) {
    prepare(option === "--allow-dirty");
  } else if (command === "published" && option === undefined) {
    published();
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
