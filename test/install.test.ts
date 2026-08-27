import { expect, test } from "bun:test";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { InstallSignal, nativeInstallFileSystem, type InstallFileSystem } from "../src/install/filesystem";
import { Installer, runInstaller } from "../src/install/installer";
import { checkoutInstallSource, releaseInstallSource } from "../src/install/source";

const root = resolve(import.meta.dir, "..");
const publicInstaller = join(root, "scripts", "swe-forge");
const canonicalInstaller = join(root, "src", "install", "cli.ts");
const harnesses = ["opencode", "omp", "claude", "codex", "cursor", "pi"] as const;

type ProcessResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

function runProcess(command: readonly string[], home: string): ProcessResult {
  const result = Bun.spawnSync([...command], {
    cwd: root,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function runPublic(home: string, args: readonly string[], sourceRoot = root): ProcessResult {
  const installer = sourceRoot === root ? publicInstaller : join(sourceRoot, "scripts", "swe-forge");
  return runProcess([installer, ...args], home);
}

function runInstallerWithSource(
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

function runInstallerWithSignal(home: string, signalOn: "mkdir" | "symlink"): number {
  let installer: Installer | undefined;
  let signaled = false;
  let mkdirAttempts = 0;
  const signal = (): void => {
    if (signaled) return;
    signaled = true;
    installer?.handleSignal(143);
  };
  const fileSystem: InstallFileSystem = {
    ...nativeInstallFileSystem,
    mkdir: (path) => {
      nativeInstallFileSystem.mkdir(path);
      mkdirAttempts += 1;
      if (signalOn === "mkdir" && mkdirAttempts === 2) signal();
    },
    symlink: (target, path) => {
      nativeInstallFileSystem.symlink(target, path);
      if (signalOn === "symlink") signal();
    },
  };
  installer = new Installer({ home, sourceRoot: root, fileSystem });
  try {
    return installer.execute(["install", "opencode"]);
  } catch (error) {
    if (error instanceof InstallSignal) return error.status;
    throw error;
  }
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

function assertSupportTree(support: string): void {
  assertLink(support + "/AGENTS.md", join(root, "AGENTS.md"));
  assertLink(support + "/SWE-FORGE.md", join(root, "SWE-FORGE.md"));
  assertLink(support + "/VERSION", join(root, "VERSION"));
  expect(pathExists(support + "/.swe-forge")).toBe(true);
  expect(lstatSync(support + "/.swe-forge").isSymbolicLink()).toBe(false);

  const excluded = new Set(["adapters", "runs", ".runs", "generated"]);
  for (const name of readdirSync(join(root, ".swe-forge")).sort()) {
    if (excluded.has(name)) continue;
    const source = join(root, ".swe-forge", name);
    if (!lstatSync(source).isDirectory()) continue;
    assertLink(join(support, ".swe-forge", name), source);
  }
  expect(pathExists(join(support, ".swe-forge", "adapters"))).toBe(false);
}

const deliveryCommands = ["git-commit", "git-push", "git-pr", "git-sync"] as const;

function assertProjection(home: string, harness: (typeof harnesses)[number]): void {
  let support: string;
  switch (harness) {
    case "opencode":
      support = join(home, ".config", "opencode", "swe-forge");
      assertLink(
        join(home, ".config", "opencode", "commands", "swe-forge.md"),
        join(root, ".swe-forge", "adapters", "opencode", "commands", "swe-forge.md"),
      );
      for (const command of deliveryCommands) {
        assertLink(
          join(home, ".config", "opencode", "commands", `${command}.md`),
          join(root, ".swe-forge", "adapters", "opencode", "commands", `${command}.md`),
        );
      }
      break;
    case "claude":
      support = join(home, ".claude", "swe-forge");
      assertLink(
        join(home, ".claude", "skills", "swe-forge"),
        join(root, ".swe-forge", "adapters", "claude-code", "skills", "swe-forge"),
      );
      break;
    case "omp":
      support = join(home, ".omp", "agent", "swe-forge");
      assertLink(
        join(home, ".omp", "agent", "prompts", "swe-forge.md"),
        join(root, ".swe-forge", "adapters", "omp", "prompts", "swe-forge.md"),
      );
      assertLink(
        join(home, ".omp", "agent", "extensions", "swe-forge-runtime.ts"),
        join(root, ".swe-forge", "adapters", "omp", "extensions", "swe-forge-runtime.ts"),
      );
      for (const profile of ["swe-forge-read-only", "swe-forge-writable", "swe-forge-reviewer"]) {
        assertLink(
          join(home, ".omp", "agent", "agents", `${profile}.md`),
          join(root, ".swe-forge", "adapters", "omp", "agents", `${profile}.md`),
        );
      }
      break;
    case "codex":
    case "cursor":
      support = join(home, ".agents", "swe-forge");
      assertLink(
        join(home, ".agents", "skills", "swe-forge"),
        join(root, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"),
      );
      break;
    case "pi":
      support = join(home, ".pi", "agent", "swe-forge");
      assertLink(
        join(home, ".pi", "agent", "prompts", "swe-forge.md"),
        join(root, ".swe-forge", "adapters", "pi", "prompts", "swe-forge.md"),
      );
      for (const command of deliveryCommands) {
        assertLink(
          join(home, ".pi", "agent", "prompts", `${command}.md`),
          join(root, ".swe-forge", "adapters", "pi", "prompts", `${command}.md`),
        );
      }
      assertLink(
        join(home, ".pi", "agent", "extensions", "swe-forge-runtime.ts"),
        join(root, ".swe-forge", "adapters", "pi", "extensions", "swe-forge-runtime.ts"),
      );
      break;
  }
  assertSupportTree(support);
}

test("install sources separate release projection and real roots", () => {
  const fixtureRoot = makeRoot("swe-forge-install-source-");
  try {
    const realRoot = join(fixtureRoot, "versions", "1.2.3", "canonical");
    mkdirSync(realRoot, { recursive: true });
    const logicalRoot = join(fixtureRoot, "current", "canonical");
    mkdirSync(join(fixtureRoot, "current"), { recursive: true });
    symlinkSync(realRoot, logicalRoot);

    const release = releaseInstallSource(logicalRoot, realRoot);
    expect(release).toEqual({
      mode: "release",
      logicalRoot,
      realRoot: realpathSync(realRoot),
    });
    expect(realpathSync(release.logicalRoot)).toBe(release.realRoot);
    expect(release.logicalRoot).not.toBe(release.realRoot);
    expect(new Installer({ source: release }).source).toEqual(release);

    const checkoutAlias = join(fixtureRoot, "checkout-alias");
    symlinkSync(realRoot, checkoutAlias);
    const checkout = checkoutInstallSource(checkoutAlias);
    expect(checkout).toEqual({
      mode: "checkout",
      logicalRoot: realpathSync(realRoot),
      realRoot: realpathSync(realRoot),
    });
    expect(new Installer({ sourceRoot: checkoutAlias }).source).toEqual(checkout);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("public installer preserves lifecycle for every registered harness", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-lifecycle-");
  try {
    for (const harness of harnesses) {
      const home = makeHome(fixtureRoot, harness);
      const install = runPublic(home, ["install", harness]);
      expect(install.exitCode).toBe(0);
      expect(install.stdout).toContain("installation: user harness configuration");
      assertProjection(home, harness);
      expect(runPublic(home, ["install", harness]).exitCode).toBe(0);

      const verify = runPublic(home, ["verify", harness]);
      expect(verify.exitCode).toBe(0);
      expect(verify.stdout).toContain(`PASS: SWE Forge ${harness} installation is valid`);

      const status = runPublic(home, ["status", harness]);
      expect(status.exitCode).toBe(0);
      expect(status.stdout).toContain("managed paths:");
      expect(status.stdout).toContain("verification: PASS");

      const doctor = runPublic(home, ["doctor", harness]);
      expect(doctor.exitCode).toBe(0);
      expect(doctor.stdout).toContain("doctor: PASS");

      const dryRun = runPublic(home, ["update", harness, "--dry-run"]);
      expect(dryRun.exitCode).toBe(0);
      expect(dryRun.stdout).toContain("would do nothing: installation is current");

      const manifest = join(home, ".swe-forge-install-state", `${harness}.tsv`);
      expect(readFileSync(manifest, "utf8")).toContain("manifest_version=2\n");
      expect(readFileSync(manifest, "utf8")).toContain("source_version=");
      expect(readFileSync(manifest, "utf8")).toContain("source_commit=");

      const uninstall = runPublic(home, ["uninstall", harness]);
      expect(uninstall.exitCode).toBe(0);
      expect(uninstall.stdout).toContain(`uninstalled: ${harness}`);
      assertCleanHome(home);
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 120_000);

test("public wrapper delegates version to the canonical CLI", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-version-");
  try {
    const publicResult = runPublic(fixtureRoot, ["version"]);
    const canonicalResult = runProcess([process.execPath, canonicalInstaller, "version"], fixtureRoot);
    expect(publicResult.exitCode).toBe(0);
    expect(publicResult.stdout).toBe(canonicalResult.stdout);
    expect(publicResult.stderr).toBe(canonicalResult.stderr);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("dry-run and conflict refusal never create installation state", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-refusal-");
  try {
    const dryHome = makeHome(fixtureRoot, "dry");
    const dryRun = runPublic(dryHome, ["install", "opencode", "--dry-run"]);
    expect(dryRun.exitCode).toBe(0);
    expect(dryRun.stdout).toContain("dry-run: no files, links, locks, or manifests will be changed");
    expect(pathExists(join(dryHome, ".config"))).toBe(false);
    assertCleanHome(dryHome);

    const conflictHome = makeHome(fixtureRoot, "conflict");
    mkdirSync(join(conflictHome, ".config", "opencode", "commands"), { recursive: true });
    writeFileSync(join(conflictHome, ".config", "opencode", "commands", "swe-forge.md"), "existing\n");
    const conflict = runPublic(conflictHome, ["install", "opencode"]);
    expect(conflict.exitCode).toBe(1);
    expect(conflict.stderr).toContain("installation stopped before writing");
    expect(pathExists(join(conflictHome, ".config", "opencode", "swe-forge"))).toBe(false);
    expect(pathExists(join(conflictHome, ".swe-forge-install-state"))).toBe(false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);

test("modified and stale managed links preserve refusal and repair decisions", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-links-");
  try {
    const home = makeHome(fixtureRoot, "home");
    expect(runPublic(home, ["install", "opencode"]).exitCode).toBe(0);

    const managed = join(home, ".config", "opencode", "commands", "git-pr.md");
    rmSync(managed);
    symlinkSync(join(root, "README.md"), managed);

    const modified = runPublic(home, ["update", "opencode"]);
    expect(modified.exitCode).toBe(1);
    expect(modified.stderr).toContain("managed link was modified");
    const uninstall = runPublic(home, ["uninstall", "opencode"]);
    expect(uninstall.exitCode).toBe(1);
    expect(uninstall.stderr).toContain("managed link was modified");
    assertLink(managed, join(root, "README.md"));

    rmSync(managed);
    writeFileSync(managed, "ambiguous\n");
    const nonLink = runPublic(home, ["update", "opencode"]);
    expect(nonLink.exitCode).toBe(1);
    expect(nonLink.stderr).toContain("managed link was replaced by a non-link");

    rmSync(managed);
    const currentTarget = join(root, ".swe-forge", "adapters", "opencode", "commands", "git-pr.md");
    symlinkSync(currentTarget, managed);
    expect(runPublic(home, ["update", "opencode"]).exitCode).toBe(0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);

test("shared support ownership and stale managed entries are handled safely", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-shared-");
  try {
    const home = makeHome(fixtureRoot, "home");
    expect(runPublic(home, ["install", "codex"]).exitCode).toBe(0);
    expect(runPublic(home, ["install", "cursor"]).exitCode).toBe(0);

    expect(runPublic(home, ["uninstall", "codex"]).exitCode).toBe(0);
    const sharedSupport = join(home, ".agents", "swe-forge");
    assertLink(join(home, ".agents", "skills", "swe-forge"), join(root, ".swe-forge", "adapters", "shared", "agent-skill", "swe-forge"));
    assertSupportTree(sharedSupport);
    expect(pathExists(join(home, ".swe-forge-install-state", "cursor.tsv"))).toBe(true);

    expect(runPublic(home, ["uninstall", "cursor"]).exitCode).toBe(0);
    expect(pathExists(join(home, ".agents", "skills", "swe-forge"))).toBe(false);
    expect(pathExists(join(sharedSupport, "AGENTS.md"))).toBe(false);

    expect(runPublic(home, ["install", "opencode"]).exitCode).toBe(0);
    const manifest = join(home, ".swe-forge-install-state", "opencode.tsv");
    const staleRelative = ".config/opencode/commands/stale.md";
    const staleTarget = join(root, "README.md");
    symlinkSync(staleTarget, join(home, staleRelative));
    writeFileSync(manifest, `${readFileSync(manifest, "utf8")}entry\tfile\t${staleRelative}\t${staleTarget}\t${staleTarget}\n`);
    expect(runPublic(home, ["update", "opencode"]).exitCode).toBe(0);
    expect(pathExists(join(home, staleRelative))).toBe(false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}, 30_000);

test("symlinked ancestors, locks, invalid registries, and failures remain safe", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-safety-");
  try {
    const symlinkHome = makeHome(fixtureRoot, "symlink-home");
    const external = makeHome(fixtureRoot, "external");
    symlinkSync(external, join(symlinkHome, ".config"));
    const symlinkResult = runPublic(symlinkHome, ["install", "opencode"]);
    expect(symlinkResult.exitCode).toBe(1);
    expect(symlinkResult.stderr).toContain("destination path contains a symlinked directory");
    expect(pathExists(join(external, "opencode"))).toBe(false);
    expect(pathExists(join(symlinkHome, ".swe-forge-install.lock"))).toBe(false);

    const lockedHome = makeHome(fixtureRoot, "locked-home");
    mkdirSync(join(lockedHome, ".swe-forge-install.lock"));
    const locked = runPublic(lockedHome, ["install", "opencode"]);
    expect(locked.exitCode).toBe(1);
    expect(locked.stderr).toContain("another installation may be active");
    expect(pathExists(join(lockedHome, ".swe-forge-install.lock"))).toBe(true);

    const installedHome = makeHome(fixtureRoot, "installed-home");
    expect(runPublic(installedHome, ["install", "opencode"]).exitCode).toBe(0);
    mkdirSync(join(installedHome, ".swe-forge-install.lock"));
    const uninstallLocked = runPublic(installedHome, ["uninstall", "opencode"]);
    expect(uninstallLocked.exitCode).toBe(1);
    expect(uninstallLocked.stderr).toContain("another installation may be active");
    expect(pathExists(join(installedHome, ".config", "opencode", "commands", "swe-forge.md"))).toBe(true);

    const invalidSource = join(fixtureRoot, "invalid-source");
    mkdirSync(invalidSource);
    cpSync(join(root, "scripts"), join(invalidSource, "scripts"), { recursive: true });
    cpSync(join(root, "src"), join(invalidSource, "src"), { recursive: true });
    cpSync(join(root, ".swe-forge"), join(invalidSource, ".swe-forge"), { recursive: true });
    for (const file of ["AGENTS.md", "SWE-FORGE.md", "VERSION"]) {
      cpSync(join(root, file), join(invalidSource, file));
    }
    writeFileSync(
      join(invalidSource, ".swe-forge", "adapters", "registry.tsv"),
      "opencode|file|opencode/commands/swe-forge.md|../outside|.config/opencode/swe-forge",
    );
    const invalidHome = makeHome(fixtureRoot, "invalid-home");
    const invalid = runPublic(invalidHome, ["install", "opencode"], invalidSource);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain("invalid adapter registry row");
    expect(pathExists(join(invalidHome, ".swe-forge-install-state"))).toBe(false);
    for (const signalOn of ["symlink", "mkdir"] as const) {
      const signalHome = makeHome(fixtureRoot, `signal-${signalOn}`);
      expect(runInstallerWithSignal(signalHome, signalOn)).toBe(143);
      assertCleanHome(signalHome);
    }

    const rollbackHome = makeHome(fixtureRoot, "rollback-home");
    let linkAttempts = 0;
    const failingFileSystem: InstallFileSystem = {
      ...nativeInstallFileSystem,
      symlink: (target, path) => {
        linkAttempts += 1;
        if (linkAttempts >= 3) throw new Error("injected link failure");
        nativeInstallFileSystem.symlink(target, path);
      },
    };
    const rollback = runInstallerWithSource(rollbackHome, root, ["install", "opencode"], failingFileSystem);
    expect(rollback.exitCode).toBe(1);
    expect(rollback.stderr).toContain("could not install source link");
    assertCleanHome(rollbackHome);

    const publishFailureHome = makeHome(fixtureRoot, "publish-failure-home");
    const failingPublishFileSystem: InstallFileSystem = {
      ...nativeInstallFileSystem,
      rename: () => {
        throw new Error("injected manifest publication failure");
      },
    };
    const publishFailure = runInstallerWithSource(
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

test("obsolete project installation options remain rejected", () => {
  const fixtureRoot = makeRoot("swe-forge-installer-options-");
  try {
    expect(runPublic(fixtureRoot, ["install", "opencode", "--target", join(fixtureRoot, "old")]).stderr).toContain(
      "--target is no longer supported",
    );
    expect(runPublic(fixtureRoot, ["install", "opencode", "--global"]).stderr).toContain(
      "--global is no longer supported",
    );
    expect(runPublic(fixtureRoot, ["install", "opencode", "--mode", "copy"]).stderr).toContain(
      "--mode is no longer supported",
    );
    expect(runPublic(fixtureRoot, ["install", "opencode", join(fixtureRoot, "old")]).stderr).toContain(
      "project installation is no longer supported",
    );
    const relativeHome = runInstallerWithSource("relative", root, ["install", "opencode"]);
    expect(relativeHome.stderr).toContain("HOME must be an absolute path");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
