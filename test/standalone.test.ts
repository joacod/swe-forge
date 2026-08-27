import { expect, test } from "bun:test";
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createEmbeddedPayload } from "../src/distribution/embedded-payload";
import { materializeEmbeddedRelease } from "../src/distribution/managed-payload";
import { runInstaller } from "../src/install/installer";
import { nativeInstallFileSystem, type InstallFileSystem } from "../src/install/filesystem";
import { releaseInstallSource } from "../src/install/source";
import { buildStandalone } from "../scripts/build-standalone";
import {
  enumerateReleasePayload,
  renderEmbeddedAssetsModule,
} from "../scripts/generate-standalone-assets";

const root = resolve(import.meta.dir, "..");

interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
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

function assetPaths(): readonly string[] {
  return enumerateReleasePayload(root).map((asset) => asset.path);
}

async function buildStandaloneFixture(
  outputPath: string,
  versionSourcePath: string,
): Promise<void> {
  const staging = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-standalone-fixture-build-"));
  const generatedAssetsPath = join(staging, "embedded-assets.ts");
  const entryPath = join(staging, "entry.ts");
  const assets = enumerateReleasePayload(root).map((asset) =>
    asset.path === "VERSION" ? { ...asset, sourcePath: versionSourcePath } : asset,
  );
  const importPath = (sourcePath: string): string => {
    const value = relative(dirname(entryPath), sourcePath).split("\\").join("/");
    return value.startsWith(".") ? value : `./${value}`;
  };
  try {
    writeFileSync(generatedAssetsPath, renderEmbeddedAssetsModule(assets, generatedAssetsPath));
    writeFileSync(
      entryPath,
      [
        "// Generated standalone fixture entry.",
        `import { createEmbeddedPayload } from ${JSON.stringify(importPath(join(root, "src/distribution/embedded-payload.ts")))};`,
        `import { runStandaloneCli } from ${JSON.stringify(importPath(join(root, "src/distribution/standalone-cli.ts")))};`,
        `import { embeddedAssets } from ${JSON.stringify(importPath(generatedAssetsPath))};`,
        "",
        "process.exitCode = await runStandaloneCli(process.argv.slice(2), createEmbeddedPayload(embeddedAssets));",
        "",
      ].join("\n"),
    );

    const workingDirectory = process.cwd();
    let result: { readonly success: boolean; readonly logs: readonly { readonly message: string }[] };
    try {
      process.chdir(staging);
      result = await Bun.build({
        entrypoints: [entryPath],
        format: "esm",
        compile: {
          outfile: outputPath,
          autoloadBunfig: false,
          autoloadDotenv: false,
          autoloadPackageJson: false,
          autoloadTsconfig: false,
        },
      });
    } finally {
      process.chdir(workingDirectory);
    }
    if (!result.success) {
      throw new Error(result.logs.map((log) => log.message).join("\n"));
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

test("release payload inventory is canonical, sorted, and excludes local files", () => {
  const localSuffix = `${process.pid}-${Date.now()}`;
  const localCanonicalFile = join(root, ".swe-forge", "policies", `local-${localSuffix}.md`);
  const localAdapterFile = join(
    root,
    ".swe-forge",
    "adapters",
    "opencode",
    "commands",
    `local-${localSuffix}.md`,
  );
  const ephemeralFiles = [
    join(root, ".swe-forge", "runs", `run-${localSuffix}`),
    join(root, ".swe-forge", ".runs", `run-${localSuffix}`),
    join(root, ".swe-forge", "generated", `generated-${localSuffix}`),
  ];
  try {
    writeFileSync(localCanonicalFile, "local\n");
    writeFileSync(localAdapterFile, "local\n");
    for (const path of ephemeralFiles) {
      mkdirSync(join(path, "nested"), { recursive: true });
      writeFileSync(join(path, "nested", "asset.md"), "ephemeral\n");
    }

    const first = enumerateReleasePayload(root);
    const second = enumerateReleasePayload(root);
    const paths = first.map((asset) => asset.path);

    expect(first).toEqual(second);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(first.map((asset) => asset.sourcePath)).size).toBe(first.length);

    for (const path of [
      "AGENTS.md",
      "SWE-FORGE.md",
      "VERSION",
      ".swe-forge/adapters/registry.tsv",
      ".swe-forge/agents/orchestrator.md",
      ".swe-forge/contracts/run-state.md",
      ".swe-forge/tools/swe-forge-state",
      ".swe-forge/adapters/opencode/commands/swe-forge.md",
      ".swe-forge/adapters/shared/agent-skill/swe-forge/SKILL.md",
    ]) {
      expect(paths).toContain(path);
    }

    for (const path of [
      ".swe-forge/adapters/README.md",
      ".swe-forge/adapters/opencode/README.md",
      ".swe-forge/runs/",
      ".swe-forge/.runs/",
      ".swe-forge/generated/",
    ]) {
      expect(paths.some((asset) => asset === path || asset.startsWith(path))).toBe(false);
    }
    expect(paths).not.toContain(`.swe-forge/policies/local-${localSuffix}.md`);
    expect(paths).not.toContain(`.swe-forge/adapters/opencode/commands/local-${localSuffix}.md`);
    expect(paths.some((path) => path.includes(localSuffix))).toBe(false);
  } finally {
    rmSync(localCanonicalFile, { force: true });
    rmSync(localAdapterFile, { force: true });
    for (const path of ephemeralFiles) rmSync(path, { recursive: true, force: true });
  }
});

test("asset generator emits one deterministic static file import per asset", () => {
  const assets = enumerateReleasePayload(root);
  const generatedDirectory = mkdtempSync(join(tmpdir(), "swe-forge-assets-module-"));
  const generatedPath = join(generatedDirectory, "embedded-assets.ts");
  try {
    const first = renderEmbeddedAssetsModule(assets, generatedPath);
    const second = renderEmbeddedAssetsModule(assets, generatedPath);
    expect(first).toBe(second);
    expect((first.match(/ with \{ type: "file" \};/g) ?? []).length).toBe(assets.length);
    for (const asset of assets) expect(first).toContain(`path: ${JSON.stringify(asset.path)}`);
  } finally {
    rmSync(generatedDirectory, { recursive: true, force: true });
  }
});

test("embedded payload boundary reads only its declared assets", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "swe-forge-payload-boundary-"));
  try {
    const versionPath = join(fixture, "VERSION");
    const specificationPath = join(fixture, "SWE-FORGE.md");
    writeFileSync(versionPath, "9.9.9-fixture\n");
    writeFileSync(specificationPath, "fixture specification\n");
    const payload = createEmbeddedPayload([
      { path: "SWE-FORGE.md", embeddedPath: specificationPath },
      { path: "VERSION", embeddedPath: versionPath },
    ]);

    expect(payload.hasPayload()).toBe(true);
    expect(payload.listPaths()).toEqual(["SWE-FORGE.md", "VERSION"]);
    expect(await payload.readVersion()).toBe("9.9.9-fixture");
    expect(await payload.readText("SWE-FORGE.md")).toBe("fixture specification\n");
    await payload.validate();
    expect(readdirSync(fixture).sort()).toEqual(["SWE-FORGE.md", "VERSION"]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("compiled executable reports embedded version and runs canonical ports after relocation", async () => {
  const built = await buildStandalone();
  const fixture = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-standalone-relocation-"));
  const releaseRoot = join(fixture, "release");
  const relocated = join(releaseRoot, "swe-forge");
  const home = join(fixture, "home");
  mkdirSync(releaseRoot);
  mkdirSync(home);
  copyFileSync(built.outputPath, relocated);
  chmodSync(relocated, 0o755);
  const env: Record<string, string> = {
    HOME: home,
    PATH: process.env.PATH ?? "",
    TMPDIR: fixture,
    XDG_DATA_HOME: join(fixture, "data"),
  };
  try {
    expect(readdirSync(fixture).sort()).toEqual(["home", "release"]);
    const expectedVersion = readFileSync(join(root, "VERSION"), "utf8").split("\n")[0] ?? "";

    const version = run([relocated, "version"], fixture, env);
    expect(version.exitCode).toBe(0);
    expect(version.stdout).toContain(`SWE Forge version: ${expectedVersion}\n`);
    expect(version.stdout).not.toContain(root);
    expect(version.stderr).toBe("");

    const embeddedVersion = run([relocated, "payload", "read", "VERSION"], fixture, env);
    expect(embeddedVersion.exitCode).toBe(0);
    expect(embeddedVersion.stdout).toBe(readFileSync(join(root, "VERSION"), "utf8"));
    expect(embeddedVersion.stderr).toBe("");

    const inspection = run([relocated, "payload", "inspect"], fixture, env);
    expect(inspection.exitCode).toBe(0);
    expect(inspection.stderr).toBe("");
    const inspected = JSON.parse(inspection.stdout) as {
      readonly embedded: boolean;
      readonly version: string;
      readonly asset_count: number;
      readonly assets: readonly { readonly path: string; readonly bytes: number }[];
    };
    expect(inspected.embedded).toBe(true);
    expect(inspected.version).toBe(expectedVersion);
    expect(inspected.asset_count).toBe(assetPaths().length);
    expect(inspected.assets.map((asset) => asset.path)).toEqual([...assetPaths()]);
    expect(inspected.assets.every((asset) => asset.bytes > 0)).toBe(true);

    const materialized = run([relocated, "payload", "materialize", "--activate"], fixture, env);
    expect(materialized.exitCode).toBe(0);
    expect(materialized.stdout).toContain(`release version: ${expectedVersion}\n`);
    expect(materialized.stdout).toContain("current:");
    expect(materialized.stderr).toBe("");
    expect(readlinkSync(join(fixture, "data", "swe-forge", "current"))).toBe(
      `versions/${expectedVersion}`,
    );

    const read = run([relocated, "payload", "read", "SWE-FORGE.md"], fixture, env);
    expect(read.exitCode).toBe(0);
    expect(read.stdout).toContain("# SWE Forge Specification\n");
    expect(read.stderr).toBe("");

    const toolNames = [
      "swe-forge-gate",
      "swe-forge-invocation",
      "swe-forge-state",
      "swe-forge-worker-brief",
      "swe-forge-worker-result",
    ] as const;
    const toolRoot = join(
      fixture,
      "data",
      "swe-forge",
      "current",
      "canonical",
      ".swe-forge",
      "tools",
    );
    expect(readdirSync(toolRoot).sort()).toEqual([...toolNames].sort());
    for (const toolName of toolNames) {
      expect(lstatSync(join(toolRoot, toolName)).mode & 0o111).not.toBe(0);
    }

    const runtimeBin = join(fixture, "runtime-bin");
    mkdirSync(runtimeBin);
    const gitPathResult = run(["sh", "-c", "command -v git"], fixture, env);
    const dirnamePathResult = run(["sh", "-c", "command -v dirname"], fixture, env);
    expect(gitPathResult.exitCode).toBe(0);
    expect(dirnamePathResult.exitCode).toBe(0);
    symlinkSync(gitPathResult.stdout.trim(), join(runtimeBin, "git"));
    symlinkSync(dirnamePathResult.stdout.trim(), join(runtimeBin, "dirname"));
    const runtimeEnv: Record<string, string> = {
      HOME: home,
      PATH: runtimeBin,
      TMPDIR: fixture,
      XDG_DATA_HOME: join(fixture, "data"),
    };
    for (const runtime of ["bun", "node", "python", "python3"]) {
      const unavailable = run(["/bin/sh", "-c", `command -v ${runtime}`], fixture, runtimeEnv);
      expect(unavailable.exitCode).not.toBe(0);
    }

    const checkout = join(fixture, "checkout");
    mkdirSync(checkout);
    const gitSetup = [
      ["git", "-C", checkout, "init", "-q", "-b", "feature"],
      ["git", "-C", checkout, "config", "user.email", "standalone-fixture@example.com"],
      ["git", "-C", checkout, "config", "user.name", "Standalone Fixture"],
    ] as const;
    for (const command of gitSetup) expect(run(command, fixture, env).exitCode).toBe(0);
    writeFileSync(join(checkout, "base.txt"), "base\n");
    expect(run(["git", "-C", checkout, "add", "base.txt"], fixture, env).exitCode).toBe(0);
    expect(run(["git", "-C", checkout, "commit", "-qm", "Fixture base"], fixture, env).exitCode).toBe(0);

    const invocationTool = join(toolRoot, "swe-forge-invocation");
    const invocation = run(
      [invocationTool, "parse", "--raw-arguments", "guided clean-room invocation"],
      checkout,
      runtimeEnv,
    );
    expect(invocation.exitCode).toBe(0);
    expect(JSON.parse(invocation.stdout)).toEqual({
      raw_arguments: "guided clean-room invocation",
      parsed_ticket: "clean-room invocation",
      delivery_mode: "GUIDED",
      input_status: "COMPLETE",
    });
    expect(invocation.stderr).toBe("");

    const stateTool = join(toolRoot, "swe-forge-state");
    const stateDirectory = join(fixture, "state");
    const stateInit = run(
      [stateTool, "init", "--state", stateDirectory, "--checkout", checkout, "--delivery-mode", "PR"],
      checkout,
      runtimeEnv,
    );
    expect(stateInit.exitCode).toBe(0);
    expect(stateInit.stderr).toBe("");
    const stateValidation = run([stateTool, "validate", "--state", stateDirectory], checkout, runtimeEnv);
    expect(stateValidation.exitCode).toBe(0);
    expect(stateValidation.stdout).toContain("PASS: schema-v5 run state is structurally valid");
    expect(stateValidation.stderr).toBe("");

    const gateTool = join(toolRoot, "swe-forge-gate");
    const gateState = join(fixture, "gate-state");
    const preflight = run(
      [gateTool, "preflight", "--state", gateState, "--branch", "feature", "--base", "HEAD", "--delivery-mode", "PR"],
      checkout,
      runtimeEnv,
    );
    expect(preflight.exitCode).toBe(0);
    expect(preflight.stderr).toBe("");
    const recordedStatus = run(
      [gateTool, "record-check-status", "--state", gateState, "--name", "standalone gate", "--status", "passed", "--final"],
      checkout,
      runtimeEnv,
    );
    expect(recordedStatus.exitCode).toBe(0);
    expect(recordedStatus.stdout).toContain("PASS: recorded passed");
    expect(recordedStatus.stderr).toBe("");

    const briefPath = join(fixture, "worker-brief.json");
    writeFileSync(
      briefPath,
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
          validation: [
            { command: "none", requirement: "informational", condition: "always", side_effects: "local-only" },
          ],
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
    const briefTool = join(toolRoot, "swe-forge-worker-brief");
    const briefValidation = run([briefTool, "validate", "--brief", briefPath], fixture, runtimeEnv);
    expect(briefValidation.exitCode).toBe(0);
    expect(briefValidation.stdout).toBe("PASS: worker briefing validated\n");
    expect(briefValidation.stderr).toBe("");
    const briefInspection = run([briefTool, "inspect", "--brief", briefPath], fixture, runtimeEnv);
    expect(briefInspection.exitCode).toBe(0);
    expect(JSON.parse(briefInspection.stdout)).toMatchObject({
      schema: "worker-brief/v1",
      valid: true,
      task_id: "clean-room",
      profile: "READ_ONLY",
      write_access: "read-only",
    });
    expect(briefInspection.stderr).toBe("");

    const resultPath = join(fixture, "worker-result.json");
    writeFileSync(
      resultPath,
      JSON.stringify({
        RESULT_PROFILE: "READ_ONLY",
        STATUS: "DONE",
        TASK_ID: "clean-room",
        FINDINGS: ["runtime is closed"],
        EVIDENCE: ["relocated executable"],
      }),
    );
    const resultTool = join(toolRoot, "swe-forge-worker-result");
    const resultSchema = run(
      [resultTool, "schema", "--profile", "READ_ONLY", "--task-id", "clean-room"],
      fixture,
      runtimeEnv,
    );
    expect(resultSchema.exitCode).toBe(0);
    const schema = JSON.parse(resultSchema.stdout) as {
      readonly properties?: { readonly TASK_ID?: { readonly const?: string } };
    };
    expect(schema.properties?.TASK_ID?.const).toBe("clean-room");
    expect(resultSchema.stderr).toBe("");
    const resultValidation = run(
      [resultTool, "validate", "--profile", "READ_ONLY", "--task-id", "clean-room", "--result", resultPath],
      fixture,
      runtimeEnv,
    );
    expect(resultValidation.exitCode).toBe(0);
    expect(JSON.parse(resultValidation.stdout)).toEqual({
      schema: "worker-result/v1",
      valid: true,
      profile: "READ_ONLY",
      status: "DONE",
      task_id: "clean-room",
    });
    expect(resultValidation.stderr).toBe("");
    expect(readdirSync(home)).toEqual([]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 120_000);

test("standalone installation keeps global release activation and shared ownership", async () => {
  const fixture = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-standalone-install-"));
  const bin = join(fixture, "bin");
  const home = join(fixture, "home");
  const dataRoot = join(fixture, "data");
  const runtimeBin = join(fixture, "runtime-bin");
  mkdirSync(bin);
  mkdirSync(home);
  mkdirSync(runtimeBin);

  const built = await buildStandalone();
  const versionOne = readFileSync(join(root, "VERSION"), "utf8").split("\n")[0]!;
  const versionTwo = "0.1.0-alpha.2";
  const standaloneOne = join(bin, "swe-forge-v1");
  const standaloneTwo = join(bin, "swe-forge-v2");
  copyFileSync(built.outputPath, standaloneOne);
  chmodSync(standaloneOne, 0o755);
  const versionTwoPath = join(fixture, "VERSION-v2");
  writeFileSync(versionTwoPath, `${versionTwo}\n`);
  await buildStandaloneFixture(standaloneTwo, versionTwoPath);
  chmodSync(standaloneTwo, 0o755);

  const dirnamePath = run(["/bin/sh", "-c", "command -v dirname"], fixture, {
    PATH: process.env.PATH ?? "",
  });
  expect(dirnamePath.exitCode).toBe(0);
  symlinkSync(dirnamePath.stdout.trim(), join(runtimeBin, "dirname"));
  const environment: Record<string, string> = {
    HOME: home,
    PATH: runtimeBin,
    TMPDIR: fixture,
    XDG_DATA_HOME: dataRoot,
  };
  const currentCanonical = join(dataRoot, "swe-forge", "current", "canonical");
  const support = join(home, ".agents", "swe-forge");
  const skill = join(home, ".agents", "skills", "swe-forge");
  const runtimePointer = join(dataRoot, "swe-forge-runtime");
  const stateDirectory = join(home, ".swe-forge-install-state");

  const assertLink = (path: string, target: string): void => {
    expect(lstatSync(path).isSymbolicLink()).toBe(true);
    expect(readlinkSync(path)).toBe(target);
  };
  const assertManifest = (harness: string, version: string): void => {
    const contents = readFileSync(join(stateDirectory, `${harness}.tsv`), "utf8");
    expect(contents).toContain(`source_root=${currentCanonical}\n`);
    expect(contents).toContain(`source_version=${version}\n`);
    const entries = contents.split("\n").filter((line) => line.startsWith("entry\t"));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const fields = entry.split("\t");
      expect(fields).toHaveLength(5);
      expect(fields[4]).toContain(currentCanonical);
      expect(fields[4]).not.toContain("/versions/");
    }
  };

  try {
    for (const runtime of ["bun", "node", "python", "python3"]) {
      const unavailable = run(["/bin/sh", "-c", `command -v ${runtime}`], fixture, environment);
      expect(unavailable.exitCode).not.toBe(0);
    }
    const dryRun = run([standaloneOne, "install", "codex", "--dry-run"], fixture, environment);
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.stderr).toBe("");
    expect(dryRun.stdout).toContain("dry-run: no files, links, locks, or manifests will be changed");
    expect(lstatSync(dataRoot, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(runtimePointer, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(stateDirectory, { throwIfNoEntry: false })).toBeUndefined();


    const installCodex = run([standaloneOne, "install", "codex"], fixture, environment);
    expect(installCodex.exitCode).toBe(0);
    expect(installCodex.stderr).toBe("");
    expect(readlinkSync(join(dataRoot, "swe-forge", "current"))).toBe(`versions/${versionOne}`);
    expect(realpathSync(runtimePointer)).toBe(realpathSync(standaloneOne));
    assertManifest("codex", versionOne);
    assertLink(join(support, "AGENTS.md"), join(currentCanonical, "AGENTS.md"));
    assertLink(
      join(support, ".swe-forge", "tools"),
      join(currentCanonical, ".swe-forge", "tools"),
    );
    assertLink(
      skill,
      join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"),
    );

    const installCursor = run([standaloneOne, "install", "cursor"], fixture, environment);
    expect(installCursor.exitCode).toBe(0);
    expect(installCursor.stderr).toBe("");
    expect(readdirSync(stateDirectory).sort()).toEqual(["codex.tsv", "cursor.tsv"]);
    assertManifest("cursor", versionOne);
    assertLink(skill, join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));

    const invocationTool = join(support, ".swe-forge", "tools", "swe-forge-invocation");
    const invocationOne = run(
      [invocationTool, "parse", "--raw-arguments", "guided standalone installation"],
      fixture,
      environment,
    );
    expect(invocationOne.exitCode).toBe(0);
    expect(JSON.parse(invocationOne.stdout)).toMatchObject({
      parsed_ticket: "standalone installation",
      delivery_mode: "GUIDED",
    });
    expect(invocationOne.stderr).toBe("");
    const verify = run([standaloneOne, "verify", "codex"], fixture, environment);
    expect(verify.exitCode).toBe(0);
    expect(verify.stdout).toContain("PASS: SWE Forge codex installation is valid");
    expect(verify.stderr).toBe("");
    const status = run([standaloneOne, "status", "codex"], fixture, environment);
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain(`source: ${currentCanonical}`);
    expect(status.stdout).toContain("verification: PASS");
    expect(status.stderr).toBe("");
    const doctor = run([standaloneOne, "doctor", "codex"], fixture, environment);
    expect(doctor.exitCode).toBe(0);
    expect(doctor.stdout).toContain("doctor: PASS");
    expect(doctor.stderr).toBe("");

    const update = run([standaloneTwo, "update"], fixture, environment);
    expect(update.exitCode).toBe(0);
    expect(update.stderr).toBe("");
    expect(readlinkSync(join(dataRoot, "swe-forge", "current"))).toBe(`versions/${versionTwo}`);
    expect(realpathSync(runtimePointer)).toBe(realpathSync(standaloneTwo));
    assertManifest("codex", versionTwo);
    assertManifest("cursor", versionTwo);
    assertLink(join(support, "AGENTS.md"), join(currentCanonical, "AGENTS.md"));
    assertLink(skill, join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));

    const invocationTwo = run(
      [invocationTool, "parse", "--raw-arguments", "guided updated installation"],
      fixture,
      environment,
    );
    expect(invocationTwo.exitCode).toBe(0);
    expect(JSON.parse(invocationTwo.stdout)).toMatchObject({
      parsed_ticket: "updated installation",
      delivery_mode: "GUIDED",
    });
    expect(invocationTwo.stderr).toBe("");

    const uninstallCodex = run([standaloneTwo, "uninstall", "codex"], fixture, environment);
    expect(uninstallCodex.exitCode).toBe(0);
    expect(uninstallCodex.stderr).toBe("");
    expect(readdirSync(stateDirectory)).toEqual(["cursor.tsv"]);
    assertLink(skill, join(currentCanonical, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));
    expect(readFileSync(join(stateDirectory, "cursor.tsv"), "utf8")).toContain(
      `${currentCanonical}/.swe-forge/tools`,
    );

    const uninstallCursor = run([standaloneTwo, "uninstall", "cursor"], fixture, environment);
    expect(uninstallCursor.exitCode).toBe(0);
    expect(uninstallCursor.stderr).toBe("");
    expect(lstatSync(stateDirectory, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(skill, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(join(support, "AGENTS.md"), { throwIfNoEntry: false })).toBeUndefined();

    const reinstall = run([standaloneTwo, "install", "codex"], fixture, environment);
    expect(reinstall.exitCode).toBe(0);
    const foreignTarget = join(fixture, "foreign-target");
    writeFileSync(foreignTarget, "foreign\n");
    rmSync(skill);
    symlinkSync(foreignTarget, skill);
    const modified = run([standaloneTwo, "update"], fixture, environment);
    expect(modified.exitCode).toBe(1);
    expect(modified.stderr).toContain("managed link was modified");
    assertLink(skill, foreignTarget);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 180_000);

test("release projection failure rolls back harness links but keeps its version", async () => {
  const fixture = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-release-rollback-"));
  try {
    const dataRoot = join(fixture, "data");
    const home = join(fixture, "home");
    mkdirSync(home);
    const payload = createEmbeddedPayload(
      enumerateReleasePayload(root).map((asset) => ({
        path: asset.path,
        embeddedPath: asset.sourcePath,
        mode: asset.mode,
      })),
    );
    const materialized = await materializeEmbeddedRelease(payload, {
      dataRoot,
      activate: true,
    });
    const source = releaseInstallSource(
      join(materialized.layout.current, "canonical"),
      materialized.canonicalPath,
    );
    let linkAttempts = 0;
    const fileSystem: InstallFileSystem = {
      ...nativeInstallFileSystem,
      symlink: (target, path) => {
        linkAttempts += 1;
        if (linkAttempts >= 3) throw new Error("injected release projection failure");
        nativeInstallFileSystem.symlink(target, path);
      },
    };
    const stderr: string[] = [];
    const result = runInstaller(["install", "opencode"], {
      source,
      home,
      fileSystem,
      stderr: (line) => stderr.push(line),
    });

    expect(result).toBe(1);
    expect(stderr.join("\n")).toContain("could not install source link");
    expect(readlinkSync(materialized.layout.current)).toBe(`versions/${materialized.version}`);
    expect(readFileSync(join(materialized.canonicalPath, "VERSION"), "utf8")).toBe(
      `${materialized.version}\n`,
    );
    expect(lstatSync(join(home, ".swe-forge-install-state"), { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(join(home, ".config"), { throwIfNoEntry: false })).toBeUndefined();
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
