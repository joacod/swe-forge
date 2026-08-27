import { lstatSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EmbeddedPayload } from "./embedded-payload";
import {
  materializeEmbeddedRelease,
  type ManagedReleaseLayout,
} from "./managed-payload";
import { runInstaller, type InstallerAction } from "../install/installer";
import { registeredHarnesses } from "../install/registry";
import { releaseInstallSource, type InstallSource } from "../install/source";
import { runEvidenceCli } from "../core/evidence/cli";
import { runWorkerBriefCli } from "../core/worker/brief-cli";
import { runWorkerResultCli } from "../core/worker/result-cli";
import { runInvocationCli } from "../invocation-cli";
import { runStateCli } from "../state-cli";

const USAGE = `Usage:
  swe-forge version
  swe-forge --version
  swe-forge verify HARNESS
  swe-forge status HARNESS
  swe-forge doctor HARNESS
  swe-forge update [--dry-run]
  swe-forge uninstall HARNESS
  swe-forge payload [inspect]
  swe-forge payload read PATH
  swe-forge payload materialize [--activate]
  swe-forge internal state [ARGS...]
  swe-forge internal gate [ARGS...]
  swe-forge internal worker-brief [ARGS...]
  swe-forge internal worker-result [ARGS...]

Installation and update activate this executable's validated release globally.
The no-argument update reconciles every managed harness manifest.
`;

type InternalRunner = (args: readonly string[]) => number | Promise<number>;

const INTERNAL_RUNNERS: Readonly<Record<string, InternalRunner>> = {
  invocation: runInvocationCli,
  state: runStateCli,
  gate: runEvidenceCli,
  "worker-brief": runWorkerBriefCli,
  "worker-result": runWorkerResultCli,
};

interface PreparedRelease {
  readonly layout: ManagedReleaseLayout;
  readonly source: InstallSource;
  readonly version: string;
}

function fail(message: string): number {
  process.stderr.write(`FAIL: ${message}\n`);
  return 1;
}

async function reportVersion(payload: EmbeddedPayload): Promise<number> {
  await payload.validate();
  process.stdout.write(`SWE Forge version: ${await payload.readVersion()}\n`);
  process.stdout.write("source: embedded release payload\n");
  return 0;
}

async function inspectPayload(payload: EmbeddedPayload): Promise<number> {
  await payload.validate();
  const assets: Array<{ readonly path: string; readonly bytes: number }> = [];
  for (const path of payload.listPaths()) {
    assets.push({ path, bytes: (await payload.read(path)).byteLength });
  }
  process.stdout.write(
    `${JSON.stringify({
      embedded: payload.hasPayload(),
      version: await payload.readVersion(),
      payload_sha256: await payload.identity(),
      asset_count: assets.length,
      assets,
    })}\n`,
  );
  return 0;
}

async function readPayloadAsset(payload: EmbeddedPayload, path: string): Promise<number> {
  await payload.validate();
  const contents = await payload.read(path);
  process.stdout.write(new TextDecoder().decode(contents));
  return 0;
}

function standaloneExecutablePath(): string {
  const executable = process.execPath;
  if (executable.length === 0 || !executable.startsWith("/")) {
    throw new Error(`standalone executable path is not absolute: ${executable}`);
  }
  return executable;
}

function standaloneHome(): string {
  const home = process.env.HOME;
  if (home === undefined || home.length === 0) {
    throw new Error("HOME must be set for standalone installation");
  }
  return home;
}

async function prepareRelease(payload: EmbeddedPayload, activate: boolean): Promise<PreparedRelease> {
  const result = activate
    ? await materializeEmbeddedRelease(payload, {
        activate: true,
        runtimePath: standaloneExecutablePath(),
      })
    : await materializeEmbeddedRelease(payload);
  const version = activate ? result.version : result.activeVersion;
  if (version === undefined) {
    throw new Error("no active managed SWE Forge release; install a harness first");
  }

  const logicalRoot = join(result.layout.current, "canonical");
  const realRoot = join(result.layout.versions, version, "canonical");
  return {
    layout: result.layout,
    source: releaseInstallSource(logicalRoot, realRoot),
    version,
  };
}

async function withTemporaryDryRunSource<T>(
  payload: EmbeddedPayload,
  callback: (source: InstallSource) => T | Promise<T>,
): Promise<T> {
  const temporaryRoot = mkdtempSync(join(realpathSync(tmpdir()), "swe-forge-standalone-dry-run-"));
  try {
    const result = await materializeEmbeddedRelease(payload, {
      dataRoot: join(temporaryRoot, "data"),
      activate: true,
    });
    const logicalRoot = join(result.layout.current, "canonical");
    const source = releaseInstallSource(logicalRoot, result.canonicalPath);
    return await callback(source);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function dryRunOption(args: readonly string[], action: string): boolean {
  let dryRun = false;
  for (const arg of args) {
    if (arg !== "--dry-run") throw new Error(`${action} accepts only --dry-run`);
    if (dryRun) throw new Error(`${action} accepts --dry-run at most once`);
    dryRun = true;
  }
  return dryRun;
}

function requiredHarness(args: readonly string[], action: InstallerAction): string {
  if (args.length !== 1) throw new Error(`${action} requires exactly one harness`);
  return args[0]!;
}

async function installStandalone(payload: EmbeddedPayload, args: readonly string[]): Promise<number> {
  if (args.length === 0) throw new Error("install requires a harness");
  const harness = args[0]!;
  const dryRun = dryRunOption(args.slice(1), "install");
  const home = standaloneHome();
  if (dryRun) {
    return await withTemporaryDryRunSource(payload, (source) =>
      runInstaller(["install", harness, "--dry-run"], {
        source,
        home,
        handleSignals: true,
      }),
    );
  }

  const prepared = await prepareRelease(payload, true);
  process.stdout.write(`release version: ${prepared.version}\n`);
  process.stdout.write(`current: ${prepared.layout.current}\n`);
  return runInstaller(["install", harness], {
    source: prepared.source,
    home,
    handleSignals: true,
  });
}

function managedHarnesses(home: string, sourceRoot: string): readonly string[] {
  const directory = join(home, ".swe-forge-install-state");
  let stats;
  try {
    stats = lstatSync(directory);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = error.code;
      if (code === "ENOENT" || code === "ENOTDIR") return [];
    }
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`managed installation state must be a real directory: ${directory}`);
  }

  const supported = registeredHarnesses(join(sourceRoot, ".swe-forge", "adapters", "registry.tsv"));
  const harnesses: string[] = [];
  for (const name of readdirSync(directory)) {
    if (!name.endsWith(".tsv")) continue;
    const harness = name.slice(0, -".tsv".length);
    if (harness.length === 0 || !supported.has(harness)) {
      throw new Error(`unsupported managed installation manifest: ${join(directory, name)}`);
    }
    const path = join(directory, name);
    const manifestStats = lstatSync(path);
    if (manifestStats.isSymbolicLink() || !manifestStats.isFile()) {
      throw new Error(`managed installation manifest is not a regular file: ${path}`);
    }
    harnesses.push(harness);
  }
  return harnesses.sort();
}

async function updateStandalone(payload: EmbeddedPayload, args: readonly string[]): Promise<number> {
  const dryRun = dryRunOption(args, "update");
  const home = standaloneHome();
  if (dryRun) {
    return await withTemporaryDryRunSource(payload, (source) => {
      const harnesses = managedHarnesses(home, source.realRoot);
      if (harnesses.length === 0) {
        throw new Error("no managed installation manifests found; install a harness before update");
      }
      for (const harness of harnesses) {
        const status = runInstaller(["update", harness, "--dry-run"], {
          source,
          home,
          handleSignals: true,
        });
        if (status !== 0) return status;
      }
      return 0;
    });
  }

  const prepared = await prepareRelease(payload, true);
  const harnesses = managedHarnesses(home, prepared.source.realRoot);
  if (harnesses.length === 0) {
    throw new Error("no managed installation manifests found; install a harness before update");
  }
  process.stdout.write(`release version: ${prepared.version}\n`);
  process.stdout.write(`current: ${prepared.layout.current}\n`);
  for (const harness of harnesses) {
    const status = runInstaller(["update", harness], {
      source: prepared.source,
      home,
      handleSignals: true,
    });
    if (status !== 0) return status;
  }
  return 0;
}

async function runCurrentReleaseAction(
  payload: EmbeddedPayload,
  action: Exclude<InstallerAction, "install" | "update">,
  args: readonly string[],
): Promise<number> {
  const harness = requiredHarness(args, action);
  const prepared = await prepareRelease(payload, false);
  return runInstaller([action, harness], {
    source: prepared.source,
    home: standaloneHome(),
    handleSignals: true,
  });
}

async function materializePayload(payload: EmbeddedPayload, args: readonly string[]): Promise<number> {
  let activate = false;
  for (const arg of args) {
    if (arg === "--activate") {
      if (activate) return fail("payload materialize accepts --activate at most once");
      activate = true;
      continue;
    }
    return fail(`unknown payload materialize option: ${arg}`);
  }

  const result = activate
    ? await materializeEmbeddedRelease(payload, {
        activate: true,
        runtimePath: standaloneExecutablePath(),
      })
    : await materializeEmbeddedRelease(payload);
  process.stdout.write(`release version: ${result.version}\n`);
  process.stdout.write(`${result.published ? "published" : "reused"}: ${result.versionPath}\n`);
  process.stdout.write(`canonical: ${result.canonicalPath}\n`);
  if (result.activated) process.stdout.write(`current: ${result.layout.current}\n`);
  else if (result.activeVersion !== undefined) process.stdout.write(`current: unchanged (${result.activeVersion})\n`);
  if (activate) process.stdout.write(`runtime: ${join(result.layout.dataRoot, "swe-forge-runtime")}\n`);
  return 0;
}

async function runInternal(args: readonly string[]): Promise<number> {
  const name = args[0];
  if (name === undefined) return fail("internal requires a command");
  if (!Object.hasOwn(INTERNAL_RUNNERS, name)) return fail(`unknown internal command: ${name}`);
  return await INTERNAL_RUNNERS[name](args.slice(1));
}

export async function runStandaloneCli(
  args: readonly string[] = process.argv.slice(2),
  payload: EmbeddedPayload,
): Promise<number> {
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return args.length === 0 ? 2 : 0;
  }

  try {
    switch (args[0]) {
      case "version":
      case "--version":
        if (args.length !== 1) return fail(`${args[0]} does not accept additional arguments`);
        return await reportVersion(payload);
      case "install":
        return await installStandalone(payload, args.slice(1));
      case "verify":
      case "status":
      case "doctor":
      case "uninstall":
        return await runCurrentReleaseAction(payload, args[0], args.slice(1));
      case "update":
        return await updateStandalone(payload, args.slice(1));
      case "payload":
        if (args.length === 1 || (args.length === 2 && args[1] === "inspect")) {
          return await inspectPayload(payload);
        }
        if (args[1] === "read" && args.length === 3) {
          return await readPayloadAsset(payload, args[2]!);
        }
        if (args[1] === "materialize") {
          return await materializePayload(payload, args.slice(2));
        }
        return fail("use payload [inspect], payload read PATH, or payload materialize [--activate]");
      case "internal":
        return await runInternal(args.slice(1));
      default:
        return fail(`unknown command: ${args[0]}`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
