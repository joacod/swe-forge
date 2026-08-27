import { expect, test } from "bun:test";
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createEmbeddedPayload } from "../src/distribution/embedded-payload";
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

test("compiled executable reports embedded version and works after relocation", async () => {
  const built = await buildStandalone();
  const fixture = mkdtempSync(join(tmpdir(), "swe-forge-standalone-relocation-"));
  const relocated = join(fixture, "swe-forge");
  const home = join(fixture, "home");
  mkdirSync(home);
  copyFileSync(built.outputPath, relocated);
  chmodSync(relocated, 0o755);
  const env: Record<string, string> = {
    HOME: home,
    PATH: process.env.PATH ?? "",
    TMPDIR: fixture,
  };
  try {
    expect(readdirSync(fixture).sort()).toEqual(["home", "swe-forge"]);
    const expectedVersion = (readFileSync(join(root, "VERSION"), "utf8").split("\n")[0] ?? "");

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

    const read = run([relocated, "payload", "read", "SWE-FORGE.md"], fixture, env);
    expect(read.exitCode).toBe(0);
    expect(read.stdout).toContain("# SWE Forge Specification\n");
    expect(read.stderr).toBe("");
    expect(readdirSync(fixture).sort()).toEqual(["home", "swe-forge"]);
    expect(readdirSync(home)).toEqual([]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 120_000);
