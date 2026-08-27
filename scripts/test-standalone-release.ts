import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

interface ArtifactMetadata {
  readonly schema: string;
  readonly version: string;
  readonly artifact: string;
  readonly sha256: string;
  readonly payload_sha256: string;
}

const root = resolve(import.meta.dir, "..");

function fail(message: string): never {
  throw new Error(`standalone clean-room: ${message}`);
}

function run(command: readonly string[], cwd: string, env: Record<string, string>): ProcessResult {
  const result = Bun.spawnSync([...command], {
    cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function expectSuccess(command: readonly string[], cwd: string, env: Record<string, string>): string {
  const result = run(command, cwd, env);
  if (result.exitCode !== 0) fail(`${command[0]} failed: ${result.stderr.trim()}`);
  if (result.stderr.length !== 0) fail(`${command[0]} wrote to stderr: ${result.stderr.trim()}`);
  return result.stdout;
}

function expectFailure(command: readonly string[], cwd: string, env: Record<string, string>): ProcessResult {
  const result = run(command, cwd, env);
  if (result.exitCode === 0) fail(`${command[0]} unexpectedly succeeded`);
  return result;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readMetadata(artifactPath: string): ArtifactMetadata {
  const metadataPath = `${artifactPath}.json`;
  let metadata: unknown;
  try {
    metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  } catch (error) {
    fail(`could not read artifact metadata ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof metadata !== "object" || metadata === null) fail("artifact metadata is not an object");
  const value = metadata as Partial<ArtifactMetadata>;
  if (
    value.schema !== "swe-forge-release-artifact/v1" ||
    typeof value.version !== "string" ||
    typeof value.artifact !== "string" ||
    typeof value.sha256 !== "string" ||
    typeof value.payload_sha256 !== "string"
  ) {
    fail("artifact metadata has an invalid shape");
  }
  return value as ArtifactMetadata;
}

function verifyChecksum(artifactPath: string, metadata: ArtifactMetadata): void {
  const checksumPath = `${artifactPath}.sha256`;
  const fields = readFileSync(checksumPath, "utf8").trim().split(/\s+/u);
  if (fields.length !== 2 || fields[0] !== metadata.sha256 || fields[1] !== basename(artifactPath)) {
    fail(`checksum file does not describe ${basename(artifactPath)}`);
  }
  if (sha256(artifactPath) !== metadata.sha256) fail(`checksum mismatch for ${artifactPath}`);
}

function commandPath(command: string, cwd: string): string {
  const result = run(["/bin/sh", "-c", `command -v ${command}`], cwd, { PATH: process.env.PATH ?? "" });
  if (result.exitCode !== 0) fail(`required host command is unavailable: ${command}`);
  return result.stdout.trim();
}

function assertLink(path: string, target: string): void {
  if (!lstatSync(path).isSymbolicLink() || readlinkSync(path) !== target) {
    fail(`unexpected link at ${path}`);
  }
}

function assertManifest(home: string, harness: string, currentCanonical: string, version: string): void {
  const path = join(home, ".swe-forge-install-state", `${harness}.tsv`);
  const contents = readFileSync(path, "utf8");
  if (!contents.includes(`source_root=${currentCanonical}\n`)) fail(`${harness} manifest has the wrong source root`);
  if (!contents.includes(`source_version=${version}\n`)) fail(`${harness} manifest has the wrong source version`);
  for (const line of contents.split("\n").filter((entry) => entry.startsWith("entry\t"))) {
    if (line.includes("/versions/")) fail(`${harness} manifest stores a direct version target`);
    if (!line.includes(currentCanonical)) fail(`${harness} manifest does not target current`);
  }
}

function writeBrief(path: string): void {
  writeFileSync(
    path,
    JSON.stringify({
      worker_briefing: {
        schema: "worker-brief/v1",
        task_id: "clean-room",
        worker: { role: "researcher", mode: "delegated_worker", depth: 1, recursive_delegation: false },
        objective: "Inspect the relocated runtime",
        acceptance: ["Return runtime facts"],
        repository: {
          instructions: ["Read the requested fixture"],
          allowed_reads: ["README.md"],
          allowed_writes: ["none"],
        },
        architecture_decisions: [],
        validation: [{ command: "none", requirement: "informational", condition: "always", side_effects: "local-only" }],
        permissions: {
          write_access: "read-only",
          topology: "SUBAGENTS",
          allowed_actions: ["read", "validation"],
          forbidden_actions: [
            "delivery",
            "recursive delegation",
            "peer communication",
            "scope expansion",
            "topology decisions",
          ],
        },
        return: {
          profile: "READ_ONLY",
          contract: ".swe-forge/contracts/result.md",
          expected_output: ["result"],
        },
      },
    }),
  );
}

function parseArguments(args: readonly string[]): { readonly artifact: string; readonly next?: string } | "help" {
  let artifact: string | undefined;
  let next: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "-h" || argument === "--help") return "help";
    if (argument === "--next") {
      if (next !== undefined || args[index + 1] === undefined) fail("--next requires an artifact path");
      next = resolve(args[index + 1]!);
      index += 1;
      continue;
    }
    if (artifact !== undefined) fail(`unexpected argument: ${argument}`);
    artifact = resolve(argument);
  }
  if (artifact === undefined) fail("usage: bun run scripts/test-standalone-release.ts ARTIFACT [--next ARTIFACT]");
  return { artifact, ...(next === undefined ? {} : { next }) };
}

function usage(): void {
  process.stdout.write("Usage: bun run scripts/test-standalone-release.ts ARTIFACT [--next ARTIFACT]\n");
}

function assertRuntimeUnavailable(env: Record<string, string>, cwd: string): void {
  for (const runtime of ["bun", "node", "python", "python3"]) {
    if (run(["/bin/sh", "-c", `command -v ${runtime}`], cwd, env).exitCode === 0) {
      fail(`${runtime} is available in the clean-room PATH`);
    }
  }
}

async function validateArtifact(artifactPath: string, nextArtifactPath: string | undefined): Promise<void> {
  const metadata = readMetadata(artifactPath);
  verifyChecksum(artifactPath, metadata);
  if (metadata.artifact !== basename(artifactPath)) fail("artifact metadata name does not match the artifact path");

  const fixture = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-standalone-clean-room-"));
  const home = join(fixture, "home");
  const dataRoot = join(fixture, "data");
  const releaseRoot = join(fixture, "release");
  const runtimeBin = join(fixture, "runtime-bin");
  const checkout = join(fixture, "checkout");
  mkdirSync(home);
  mkdirSync(releaseRoot);
  mkdirSync(runtimeBin);
  mkdirSync(checkout);

  const relocated = join(releaseRoot, "swe-forge");
  copyFileSync(artifactPath, relocated);
  chmodSync(relocated, 0o755);
  const nextRelocated = nextArtifactPath === undefined ? undefined : join(releaseRoot, "swe-forge-next");
  if (nextArtifactPath !== undefined) {
    copyFileSync(nextArtifactPath, nextRelocated!);
    chmodSync(nextRelocated!, 0o755);
  }

  const cleanEnv: Record<string, string> = {
    HOME: home,
    PATH: runtimeBin,
    TMPDIR: fixture,
    XDG_DATA_HOME: dataRoot,
  };
  const hostEnv: Record<string, string> = {
    HOME: home,
    PATH: process.env.PATH ?? "",
    TMPDIR: fixture,
    XDG_DATA_HOME: dataRoot,
  };
  const gitPath = commandPath("git", fixture);
  const dirnamePath = commandPath("dirname", fixture);
  symlinkSync(gitPath, join(runtimeBin, "git"));
  symlinkSync(dirnamePath, join(runtimeBin, "dirname"));

  try {
    assertRuntimeUnavailable(cleanEnv, fixture);
    const version = expectSuccess([relocated, "--version"], fixture, cleanEnv);
    if (!version.startsWith(`SWE Forge version: ${metadata.version}\n`)) fail("standalone --version did not report VERSION");
    if (version.includes(root)) fail("standalone --version referenced the repository checkout");

    const inspection = JSON.parse(expectSuccess([relocated, "payload", "inspect"], fixture, cleanEnv)) as {
      readonly embedded?: boolean;
      readonly version?: string;
      readonly payload_sha256?: string;
      readonly asset_count?: number;
    };
    if (
      inspection.embedded !== true ||
      inspection.version !== metadata.version ||
      inspection.payload_sha256 !== metadata.payload_sha256 ||
      typeof inspection.asset_count !== "number" ||
      inspection.asset_count <= 0
    ) {
      fail("embedded release inventory does not match artifact metadata");
    }

    const installCodex = expectSuccess([relocated, "install", "codex"], fixture, cleanEnv);
    if (!installCodex.includes(`release version: ${metadata.version}\n`)) fail("install did not activate the artifact release");
    expectSuccess([relocated, "install", "cursor"], fixture, cleanEnv);
    const current = join(dataRoot, "swe-forge", "current");
    const currentCanonical = join(current, "canonical");
    const runtimePointer = join(dataRoot, "swe-forge-runtime");
    if (readlinkSync(current) !== `versions/${metadata.version}`) fail("current points at the wrong release");
    if (realpathSync(runtimePointer) !== realpathSync(relocated)) fail("runtime pointer does not target the running artifact");
    assertManifest(home, "codex", currentCanonical, metadata.version);
    assertManifest(home, "cursor", currentCanonical, metadata.version);

    const support = join(home, ".agents", "swe-forge");
    const skill = join(home, ".agents", "skills", "swe-forge");
    const invocationTool = join(support, ".swe-forge", "tools", "swe-forge-invocation");
    const invocation = JSON.parse(
      expectSuccess([invocationTool, "parse", "--raw-arguments", "guided clean-room invocation"], fixture, cleanEnv),
    ) as { readonly parsed_ticket?: string; readonly delivery_mode?: string };
    if (invocation.parsed_ticket !== "clean-room invocation" || invocation.delivery_mode !== "GUIDED") {
      fail("portable invocation tool returned the wrong projection");
    }

    expectSuccess(["git", "-C", checkout, "init", "-q", "-b", "feature"], fixture, hostEnv);
    expectSuccess(["git", "-C", checkout, "config", "user.email", "clean-room@example.com"], fixture, hostEnv);
    expectSuccess(["git", "-C", checkout, "config", "user.name", "Clean Room"], fixture, hostEnv);
    writeFileSync(join(checkout, "base.txt"), "base\n");
    expectSuccess(["git", "-C", checkout, "add", "base.txt"], fixture, hostEnv);
    expectSuccess(["git", "-C", checkout, "commit", "-qm", "Fixture base"], fixture, hostEnv);

    const stateTool = join(support, ".swe-forge", "tools", "swe-forge-state");
    const stateDirectory = join(fixture, "state");
    expectSuccess([stateTool, "init", "--state", stateDirectory, "--checkout", checkout, "--delivery-mode", "PR"], fixture, cleanEnv);
    expectSuccess([stateTool, "validate", "--state", stateDirectory], fixture, cleanEnv);

    const gateTool = join(support, ".swe-forge", "tools", "swe-forge-gate");
    const gateState = join(fixture, "gate-state");
    expectSuccess([gateTool, "preflight", "--state", gateState, "--branch", "feature", "--base", "HEAD", "--delivery-mode", "PR"], checkout, cleanEnv);
    expectSuccess([gateTool, "record-check-status", "--state", gateState, "--name", "clean-room gate", "--status", "passed", "--final"], checkout, cleanEnv);

    const briefPath = join(fixture, "worker-brief.json");
    writeBrief(briefPath);
    const briefTool = join(support, ".swe-forge", "tools", "swe-forge-worker-brief");
    expectSuccess([briefTool, "validate", "--brief", briefPath], fixture, cleanEnv);
    expectSuccess([briefTool, "inspect", "--brief", briefPath], fixture, cleanEnv);

    const resultPath = join(fixture, "worker-result.json");
    writeFileSync(resultPath, JSON.stringify({
      RESULT_PROFILE: "READ_ONLY",
      STATUS: "DONE",
      TASK_ID: "clean-room",
      FINDINGS: ["runtime is closed"],
      EVIDENCE: ["relocated executable"],
    }));
    const resultTool = join(support, ".swe-forge", "tools", "swe-forge-worker-result");
    expectSuccess([resultTool, "schema", "--profile", "READ_ONLY", "--task-id", "clean-room"], fixture, cleanEnv);
    expectSuccess([resultTool, "validate", "--profile", "READ_ONLY", "--task-id", "clean-room", "--result", resultPath], fixture, cleanEnv);

    const updateExecutable = nextRelocated ?? relocated;
    const updateMetadata = nextArtifactPath === undefined ? metadata : readMetadata(nextArtifactPath);
    if (nextArtifactPath !== undefined) verifyChecksum(nextArtifactPath, updateMetadata);
    expectSuccess([updateExecutable, "update"], fixture, cleanEnv);
    if (readlinkSync(current) !== `versions/${updateMetadata.version}`) fail("update did not activate the new release");
    if (realpathSync(runtimePointer) !== realpathSync(updateExecutable)) fail("update did not move the runtime pointer");
    assertManifest(home, "codex", currentCanonical, updateMetadata.version);
    assertManifest(home, "cursor", currentCanonical, updateMetadata.version);
    assertLink(skill, join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));

    expectSuccess([updateExecutable, "uninstall", "codex"], fixture, cleanEnv);
    assertLink(skill, join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));
    expectSuccess([updateExecutable, "uninstall", "cursor"], fixture, cleanEnv);
    if (lstatSync(join(home, ".swe-forge-install-state"), { throwIfNoEntry: false }) !== undefined) {
      fail("uninstall left the managed state directory behind");
    }
    if (lstatSync(skill, { throwIfNoEntry: false }) !== undefined) fail("uninstall left a shared projection behind");

    expectSuccess([updateExecutable, "install", "codex"], fixture, cleanEnv);
    const foreignTarget = join(fixture, "foreign-target");
    writeFileSync(foreignTarget, "foreign\n");
    rmSync(skill);
    symlinkSync(foreignTarget, skill);
    const modified = expectFailure([updateExecutable, "update"], fixture, cleanEnv);
    if (!modified.stderr.includes("managed link was modified")) fail("modified managed link was not refused");
    assertLink(skill, foreignTarget);
    const modifiedUninstall = expectFailure([updateExecutable, "uninstall", "codex"], fixture, cleanEnv);
    if (!modifiedUninstall.stderr.includes("managed link was modified")) {
      fail("uninstall did not refuse a modified managed link");
    }
    assertLink(skill, foreignTarget);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

try {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed === "help") {
    usage();
    process.exitCode = 0;
  } else {
    await validateArtifact(parsed.artifact, parsed.next);
    process.stdout.write(`PASS: standalone clean-room validation (${basename(parsed.artifact)})\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
