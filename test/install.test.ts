import { expect, test } from "bun:test";
import {
  chmodSync,
  cpSync,
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
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInstaller } from "../src/install/installer";
import {
  nativeInstallFileSystem,
  type InstallFileSystem,
} from "../src/install/filesystem";

const root = resolve(import.meta.dir, "..");
const legacyInstaller = join(root, "scripts", "swe-forge");
const typedInstaller = join(root, "src", "install", "internal-cli.ts");
const harnesses = ["opencode", "omp", "claude", "codex", "cursor", "pi"] as const;

type ProcessResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

function runProcess(
  command: readonly string[],
  home: string,
  environment: Record<string, string> = {},
): ProcessResult {
  const result = Bun.spawnSync([...command], {
    cwd: root,
    env: { ...process.env, HOME: home, ...environment },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function runLegacy(
  home: string,
  args: readonly string[],
  sourceRoot = root,
  environment: Record<string, string> = {},
): ProcessResult {
  return runProcess([join(sourceRoot, "scripts", "swe-forge"), ...args], home, environment);
}

function runTyped(home: string, args: readonly string[]): ProcessResult {
  return runProcess([process.execPath, typedInstaller, ...args], home);
}

function runTypedWithSource(
  home: string,
  sourceRoot: string,
  args: readonly string[],
  fileSystem: InstallFileSystem = nativeInstallFileSystem,
): ProcessResult {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = runInstaller(args, {
    home,
    sourceRoot,
    fileSystem,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  return {
    exitCode,
    stdout: stdout.length === 0 ? "" : `${stdout.join("\n")}\n`,
    stderr: stderr.length === 0 ? "" : `${stderr.join("\n")}\n`,
  };
}

function makeRoot(prefix: string): string {
  return mkdtempSync(join(realpathSync(tmpdir()), prefix));
}

function makeHome(parent: string, name: string): string {
  const home = join(parent, name);
  mkdirSync(home);
  return realpathSync(home);
}

function pathExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeOutput(value: string, home: string, sourceRoot = root): string {
  return value.replaceAll(home, "<HOME>").replaceAll(sourceRoot, "<SOURCE>");
}

function expectEquivalent(
  legacy: ProcessResult,
  typed: ProcessResult,
  legacyHome: string,
  typedHome: string,
  legacySourceRoot = root,
  typedSourceRoot = legacySourceRoot,
): void {
  expect(typed.exitCode).toBe(legacy.exitCode);
  expect(normalizeOutput(typed.stdout, typedHome, typedSourceRoot)).toBe(
    normalizeOutput(legacy.stdout, legacyHome, legacySourceRoot),
  );
  expect(normalizeOutput(typed.stderr, typedHome, typedSourceRoot)).toBe(
    normalizeOutput(legacy.stderr, legacyHome, legacySourceRoot),
  );
}

function assertLink(path: string, target: string): void {
  expect(pathExists(path)).toBe(true);
  expect(lstatSync(path).isSymbolicLink()).toBe(true);
  expect(readlinkSync(path)).toBe(target);
}

function assertCleanHome(home: string): void {
  expect(pathExists(join(home, ".swe-forge-install-state"))).toBe(false);
  expect(pathExists(join(home, ".swe-forge-install.lock"))).toBe(false);
  expect(pathExists(join(home, ".config", "opencode", "commands", "swe-forge.md"))).toBe(false);
  expect(pathExists(join(home, ".omp", "agent", "prompts", "swe-forge.md"))).toBe(false);
  expect(pathExists(join(home, ".claude", "skills", "swe-forge"))).toBe(false);
  expect(pathExists(join(home, ".agents", "skills", "swe-forge"))).toBe(false);
  expect(pathExists(join(home, ".pi", "agent", "prompts", "swe-forge.md"))).toBe(false);
}

test("typed installer matches legacy lifecycle across every registered harness", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-parity-");
  try {
    for (const harness of harnesses) {
      const legacyHome = makeHome(fixtureRoot, `legacy-${harness}`);
      const typedHome = makeHome(fixtureRoot, `typed-${harness}`);

      const legacyInstall = runLegacy(legacyHome, ["install", harness]);
      const typedInstall = runTyped(typedHome, ["install", harness]);
      expectEquivalent(legacyInstall, typedInstall, legacyHome, typedHome);
      expect(typedInstall.exitCode).toBe(0);

      expect(runLegacy(legacyHome, ["install", harness]).exitCode).toBe(0);
      expect(runTyped(typedHome, ["install", harness]).exitCode).toBe(0);

      const legacyVerify = runLegacy(legacyHome, ["verify", harness]);
      const typedVerify = runTyped(typedHome, ["verify", harness]);
      expectEquivalent(legacyVerify, typedVerify, legacyHome, typedHome);
      expect(typedVerify.stdout).toContain(`PASS: SWE Forge ${harness} installation is valid`);

      const legacyStatus = runLegacy(legacyHome, ["status", harness]);
      const typedStatus = runTyped(typedHome, ["status", harness]);
      expectEquivalent(legacyStatus, typedStatus, legacyHome, typedHome);
      expect(typedStatus.stdout).toContain("managed paths:");
      expect(typedStatus.stdout).toContain("verification: PASS");

      const legacyDoctor = runLegacy(legacyHome, ["doctor", harness]);
      const typedDoctor = runTyped(typedHome, ["doctor", harness]);
      expectEquivalent(legacyDoctor, typedDoctor, legacyHome, typedHome);
      expect(typedDoctor.stdout).toContain("doctor: PASS");

      const legacyDryRun = runLegacy(legacyHome, ["update", harness, "--dry-run"]);
      const typedDryRun = runTyped(typedHome, ["update", harness, "--dry-run"]);
      expectEquivalent(legacyDryRun, typedDryRun, legacyHome, typedHome);
      expect(typedDryRun.stdout).toContain("would do nothing: installation is current");

      const manifest = join(typedHome, ".swe-forge-install-state", `${harness}.tsv`);
      const manifestText = readFileSync(manifest, "utf8");
      expect(manifestText).toContain("manifest_version=2\n");
      expect(manifestText).toContain("source_version=");
      expect(manifestText).toContain("source_commit=");

      const legacyUninstall = runLegacy(legacyHome, ["uninstall", harness]);
      const typedUninstall = runTyped(typedHome, ["uninstall", harness]);
      expectEquivalent(legacyUninstall, typedUninstall, legacyHome, typedHome);
      expect(typedUninstall.exitCode).toBe(0);
      assertCleanHome(typedHome);
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 120_000);

test("version reports the same source revision and worktree state", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-version-");
  try {
    const legacy = runLegacy(fixtureRoot, ["version"]);
    const typed = runTyped(fixtureRoot, ["version"]);
    expect(typed.exitCode).toBe(legacy.exitCode);
    expect(typed.stdout).toBe(legacy.stdout);
    expect(typed.stderr).toBe(legacy.stderr);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("dry-run and conflict refusal never create installation state", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-refusal-");
  try {
    const legacyDryHome = makeHome(fixtureRoot, "legacy-dry");
    const typedDryHome = makeHome(fixtureRoot, "typed-dry");
    const legacyDry = runLegacy(legacyDryHome, ["install", "opencode", "--dry-run"]);
    const typedDry = runTyped(typedDryHome, ["install", "opencode", "--dry-run"]);
    expectEquivalent(legacyDry, typedDry, legacyDryHome, typedDryHome);
    expect(typedDry.stdout).toContain("dry-run: no files, links, locks, or manifests will be changed");
    assertCleanHome(typedDryHome);

    for (const [name, run] of [
      ["legacy", (home: string) => runLegacy(home, ["install", "opencode"])],
      ["typed", (home: string) => runTyped(home, ["install", "opencode"])],
    ] as const) {
      const home = makeHome(fixtureRoot, `${name}-conflict`);
      mkdirSync(join(home, ".config", "opencode", "commands"), { recursive: true });
      writeFileSync(join(home, ".config", "opencode", "commands", "swe-forge.md"), "existing\n");
      const result = run(home);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("installation stopped before writing");
      expect(pathExists(join(home, ".config", "opencode", "swe-forge"))).toBe(false);
      expect(pathExists(join(home, ".swe-forge-install-state"))).toBe(false);
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);

test("modified and stale managed links preserve the same refusal and repair decisions", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-links-");
  try {
    const legacyHome = makeHome(fixtureRoot, "legacy");
    const typedHome = makeHome(fixtureRoot, "typed");
    expect(runLegacy(legacyHome, ["install", "opencode"]).exitCode).toBe(0);
    expect(runTyped(typedHome, ["install", "opencode"]).exitCode).toBe(0);

    const legacyManaged = join(legacyHome, ".config", "opencode", "commands", "git-pr.md");
    const typedManaged = join(typedHome, ".config", "opencode", "commands", "git-pr.md");
    rmSync(legacyManaged);
    rmSync(typedManaged);
    symlinkSync(join(root, "README.md"), legacyManaged);
    symlinkSync(join(root, "README.md"), typedManaged);

    const legacyModified = runLegacy(legacyHome, ["update", "opencode"]);
    const typedModified = runTyped(typedHome, ["update", "opencode"]);
    expectEquivalent(legacyModified, typedModified, legacyHome, typedHome);
    expect(typedModified.stderr).toContain("managed link was modified");

    const legacyUninstall = runLegacy(legacyHome, ["uninstall", "opencode"]);
    const typedUninstall = runTyped(typedHome, ["uninstall", "opencode"]);
    expectEquivalent(legacyUninstall, typedUninstall, legacyHome, typedHome);
    expect(typedUninstall.stderr).toContain("managed link was modified");
    assertLink(typedManaged, join(root, "README.md"));

    rmSync(legacyManaged);
    rmSync(typedManaged);
    writeFileSync(legacyManaged, "ambiguous\n");
    writeFileSync(typedManaged, "ambiguous\n");
    const legacyNonLink = runLegacy(legacyHome, ["update", "opencode"]);
    const typedNonLink = runTyped(typedHome, ["update", "opencode"]);
    expectEquivalent(legacyNonLink, typedNonLink, legacyHome, typedHome);
    expect(typedNonLink.stderr).toContain("managed link was replaced by a non-link");

    rmSync(legacyManaged);
    rmSync(typedManaged);
    const currentTarget = join(root, ".swe-forge", "adapters", "opencode", "commands", "git-pr.md");
    symlinkSync(currentTarget, legacyManaged);
    symlinkSync(currentTarget, typedManaged);
    expect(runLegacy(legacyHome, ["update", "opencode"]).exitCode).toBe(0);
    expect(runTyped(typedHome, ["update", "opencode"]).exitCode).toBe(0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);


test("shared support ownership and stale entries match the legacy registry model", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-shared-");
  try {
    const legacyHome = makeHome(fixtureRoot, "legacy");
    const typedHome = makeHome(fixtureRoot, "typed");
    for (const home of [legacyHome, typedHome]) {
      const runner = home === legacyHome ? runLegacy : runTyped;
      expect(runner(home, ["install", "codex"]).exitCode).toBe(0);
      expect(runner(home, ["install", "cursor"]).exitCode).toBe(0);
    }

    const legacyCodexRemoval = runLegacy(legacyHome, ["uninstall", "codex"]);
    const typedCodexRemoval = runTyped(typedHome, ["uninstall", "codex"]);
    expectEquivalent(legacyCodexRemoval, typedCodexRemoval, legacyHome, typedHome);
    const sharedSupport = join(typedHome, ".agents", "swe-forge");
    expect(pathExists(sharedSupport)).toBe(true);
    expect(pathExists(join(typedHome, ".swe-forge-install-state", "cursor.tsv"))).toBe(true);

    const legacyCursorRemoval = runLegacy(legacyHome, ["uninstall", "cursor"]);
    const typedCursorRemoval = runTyped(typedHome, ["uninstall", "cursor"]);
    expectEquivalent(legacyCursorRemoval, typedCursorRemoval, legacyHome, typedHome);
    expect(pathExists(join(typedHome, ".agents", "skills", "swe-forge"))).toBe(false);
    expect(pathExists(join(sharedSupport, "AGENTS.md"))).toBe(false);

    const legacyInstall = runLegacy(legacyHome, ["install", "opencode"]);
    const typedInstall = runTyped(typedHome, ["install", "opencode"]);
    expectEquivalent(legacyInstall, typedInstall, legacyHome, typedHome);
    const legacyManifest = join(legacyHome, ".swe-forge-install-state", "opencode.tsv");
    const typedManifest = join(typedHome, ".swe-forge-install-state", "opencode.tsv");
    const staleRelative = ".config/opencode/commands/stale.md";
    const staleTarget = join(root, "README.md");
    for (const [home, manifest] of [[legacyHome, legacyManifest], [typedHome, typedManifest]] as const) {
      const stalePath = join(home, staleRelative);
      symlinkSync(staleTarget, stalePath);
      writeFileSync(manifest, `${readFileSync(manifest, "utf8")}entry\tfile\t${staleRelative}\t${staleTarget}\t${staleTarget}\n`);
    }
    const legacyUpdate = runLegacy(legacyHome, ["update", "opencode"]);
    const typedUpdate = runTyped(typedHome, ["update", "opencode"]);
    expectEquivalent(legacyUpdate, typedUpdate, legacyHome, typedHome);
    expect(typedUpdate.exitCode).toBe(0);
    expect(pathExists(join(typedHome, staleRelative))).toBe(false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);

test("symlinked ancestors, locks, invalid registry rows, and partial failures remain safe", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-safety-");
  try {
    for (const [name, runner] of [
      ["legacy", (home: string, args: readonly string[] = ["install", "opencode"]) => runLegacy(home, args)],
      ["typed", (home: string, args: readonly string[] = ["install", "opencode"]) => runTyped(home, args)],
    ] as const) {
      const home = makeHome(fixtureRoot, `${name}-symlink`);
      const external = makeHome(fixtureRoot, `${name}-external`);
      symlinkSync(external, join(home, ".config"));
      const result = runner(home);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("destination path contains a symlinked directory");
      expect(pathExists(join(external, "opencode"))).toBe(false);
      expect(pathExists(join(home, ".swe-forge-install.lock"))).toBe(false);

      const lockedHome = makeHome(fixtureRoot, `${name}-locked`);
      mkdirSync(join(lockedHome, ".swe-forge-install.lock"));
      const locked = runner(lockedHome);
      expect(locked.exitCode).toBe(1);
      expect(locked.stderr).toContain("another installation may be active");
      expect(pathExists(join(lockedHome, ".swe-forge-install.lock"))).toBe(true);
      const installedBeforeLock = makeHome(fixtureRoot, `${name}-uninstall-locked`);
      expect(runner(installedBeforeLock).exitCode).toBe(0);
      mkdirSync(join(installedBeforeLock, ".swe-forge-install.lock"));
      const uninstallLocked = runner(installedBeforeLock, ["uninstall", "opencode"]);
      expect(uninstallLocked.exitCode).toBe(1);
      expect(uninstallLocked.stderr).toContain("another installation may be active");
      expect(pathExists(join(installedBeforeLock, ".config", "opencode", "commands", "swe-forge.md"))).toBe(true);
    }

    const invalidSource = join(fixtureRoot, "invalid-source");
    mkdirSync(invalidSource);
    cpSync(join(root, "scripts"), join(invalidSource, "scripts"), { recursive: true });
    cpSync(join(root, ".swe-forge"), join(invalidSource, ".swe-forge"), { recursive: true });
    for (const file of ["AGENTS.md", "SWE-FORGE.md", "VERSION"]) {
      cpSync(join(root, file), join(invalidSource, file));
    }
    writeFileSync(
      join(invalidSource, ".swe-forge", "adapters", "registry.tsv"),
      "opencode|file|opencode/commands/swe-forge.md|../outside|.config/opencode/swe-forge\n",
    );
    const legacyInvalidHome = makeHome(fixtureRoot, "legacy-invalid");
    const typedInvalidHome = makeHome(fixtureRoot, "typed-invalid");
    const legacyInvalid = runLegacy(legacyInvalidHome, ["install", "opencode"], invalidSource);
    const typedInvalid = runTypedWithSource(typedInvalidHome, invalidSource, ["install", "opencode"]);
    expectEquivalent(legacyInvalid, typedInvalid, legacyInvalidHome, typedInvalidHome, invalidSource);
    expect(typedInvalid.stderr).toContain("invalid adapter registry row");
    expect(pathExists(join(typedInvalidHome, ".swe-forge-install-state"))).toBe(false);

    const realLnResult = Bun.spawnSync(["sh", "-c", "command -v ln"], { stdout: "pipe", stderr: "pipe" });
    const realLn = new TextDecoder().decode(realLnResult.stdout).trim();
    const fakeBin = join(fixtureRoot, "fake-bin");
    const countFile = join(fixtureRoot, "ln-count");
    const fakeLn = join(fakeBin, "ln");
    mkdirSync(fakeBin);
    writeFileSync(
      fakeLn,
      `#!/bin/sh
count=0
test ! -f "${countFile}" || count=$(cat "${countFile}")
count=$((count + 1))
printf '%s\\n' "$count" >"${countFile}"
test "$count" -lt 3 || exit 73
exec "${realLn}" "$@"
`,
    );
    chmodSync(fakeLn, 0o755);
    const legacyRollbackHome = makeHome(fixtureRoot, "legacy-rollback");
    const legacyRollback = runLegacy(legacyRollbackHome, ["install", "opencode"], root, {
      PATH: `${fakeBin}:${process.env.PATH ?? ""}`,
    });
    expect(legacyRollback.exitCode).toBe(1);
    expect(legacyRollback.stderr).toContain("could not install");
    assertCleanHome(legacyRollbackHome);

    const rollbackHome = makeHome(fixtureRoot, "typed-rollback");
    let linkAttempts = 0;
    const failingFileSystem: InstallFileSystem = {
      ...nativeInstallFileSystem,
      symlink: (target, path) => {
        linkAttempts += 1;
        if (linkAttempts >= 3) throw new Error("injected link failure");
        nativeInstallFileSystem.symlink(target, path);
      },
    };
    const rollback = runTypedWithSource(rollbackHome, root, ["install", "opencode"], failingFileSystem);
    expect(rollback.exitCode).toBe(1);
    expect(rollback.stderr).toContain("could not install source link");
    assertCleanHome(rollbackHome);
    const publishFailureHome = makeHome(fixtureRoot, "typed-publish-rollback");
    const failingPublishFileSystem: InstallFileSystem = {
      ...nativeInstallFileSystem,
      rename: () => {
        throw new Error("injected manifest publication failure");
      },
    };
    const publishFailure = runTypedWithSource(
      publishFailureHome,
      root,
      ["install", "opencode"],
      failingPublishFileSystem,
    );
    expect(publishFailure.exitCode).toBe(1);
    expect(publishFailure.stderr).toContain("could not publish managed installation manifest");
    assertCleanHome(publishFailureHome);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);
