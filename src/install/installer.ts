import { realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  assertRealAncestors,
  ensureDirectory,
  InstallSignal,
  InstallTransaction,
  isRealDirectory,
  isRegularFile,
  isSymlink,
  nativeInstallFileSystem,
  pathExists,
  samePath,
  type InstallFileSystem,
} from "./filesystem";
import {
  manifestContainsRelative,
  manifestEntryDestination,
  manifestEntryTarget,
  manifestFileContainsRelative,
  manifestPaths,
  manifestRelativePath,
  type ManifestDocument,
  type ManifestEntry,
  type ManifestInventoryEntry,
  type ManifestPaths,
  validateManifest,
  writeManifest,
} from "./manifest";
import {
  adapterRegistryContains,
  loadAdapterRows,
  type AdapterRow,
} from "./registry";

export type InstallerAction = "install" | "verify" | "status" | "doctor" | "update" | "uninstall";

export interface InstallerOptions {
  readonly sourceRoot?: string;
  readonly home?: string;
  readonly fileSystem?: InstallFileSystem;
  readonly stdout?: (line: string) => void;
  readonly stderr?: (line: string) => void;
  readonly handleSignals?: boolean;
}

interface ParsedArguments {
  readonly action: InstallerAction;
  readonly harness: string;
  readonly dryRun: boolean;
}

interface UpdatePlanEntry {
  readonly action: "noop" | "add" | "relink" | "remove";
  readonly kind: ManifestEntry["kind"];
  readonly relative: string;
  readonly source: string;
  readonly target: string;
}

interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
}

const USAGE = `Usage:
  scripts/swe-forge version
  scripts/swe-forge install <harness> [options]
  scripts/swe-forge verify <harness>
  scripts/swe-forge status <harness>
  scripts/swe-forge doctor <harness>
  scripts/swe-forge update <harness> [options]
  scripts/swe-forge uninstall <harness>

Options:
  --dry-run           Plan install/update without writing anything.

Installations link the selected harness projection and canonical support tree
back to this SWE Forge checkout under the user's home directory.
`;

function defaultSourceRoot(): string {
  return realpathSync(resolve(import.meta.dir, "../.."));
}

function stripTrailingNewlines(value: string): string {
  return value.replace(/\n+$/, "");
}

function runCommand(command: readonly string[]): ProcessResult {
  try {
    const result = Bun.spawnSync([...command], { stdout: "pipe", stderr: "pipe" });
    return {
      exitCode: result.exitCode,
      stdout: new TextDecoder().decode(result.stdout),
    };
  } catch {
    return { exitCode: 127, stdout: "" };
  }
}

function rejectUnsupportedPath(path: string): void {
  if (path.includes("\t") || path.includes("\n")) {
    throw new Error(`paths containing tabs or newlines are not supported: ${path}`);
  }
}

export class Installer {
  public readonly sourceRoot: string;
  public readonly fileSystem: InstallFileSystem;
  public readonly transaction: InstallTransaction;
  private readonly homeInput: string | undefined;
  private readonly writeStdout: (line: string) => void;
  private readonly writeStderr: (line: string) => void;
  private action: InstallerAction | undefined;
  private harness = "";
  private dryRun = false;
  private home = "";
  private paths: ManifestPaths | undefined;
  private rows: readonly AdapterRow[] = [];
  private canonicalDirectories: readonly string[] = [];
  private lockDirectory = "";
  private lockOwned = false;
  private verifyFailures = 0;

  public constructor(options: InstallerOptions = {}) {
    this.sourceRoot = realpathSync(options.sourceRoot ?? defaultSourceRoot());
    this.fileSystem = options.fileSystem ?? nativeInstallFileSystem;
    this.transaction = new InstallTransaction(this.fileSystem);
    this.homeInput = options.home === undefined ? process.env.HOME : options.home;
    this.writeStdout = options.stdout ?? ((line) => process.stdout.write(`${line}\n`));
    this.writeStderr = options.stderr ?? ((line) => process.stderr.write(`${line}\n`));
  }

  public execute(args: readonly string[]): number {
    try {
      return this.executeUnsafe(args);
    } catch (error) {
      this.abort();
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  public abort(): void {
    if (!this.transaction.active) return;
    try {
      this.transaction.rollback();
    } catch {
      // Rollback is best effort, matching the shell implementation.
    }
    this.transaction.active = false;
  }

  public handleSignal(status: number): void {
    if (this.transaction.inCriticalSection) {
      this.transaction.deferSignal(status);
      return;
    }
    this.abort();
    this.releaseLock();
    process.exit(status);
  }

  private executeUnsafe(args: readonly string[]): number {
    if (args.length === 1 && args[0] === "version") {
      this.printVersion();
      return 0;
    }

    const parsed = this.parseArguments(args);
    if (typeof parsed === "number") return parsed;
    this.action = parsed.action;
    this.harness = parsed.harness;
    this.dryRun = parsed.dryRun;

    this.prepareManifests();
    this.validateHome();
    this.paths = manifestPaths(this.home, this.harness, this.fileSystem);

    switch (this.action) {
      case "install":
        return this.installRequestedAction();
      case "verify":
        return this.verifyRequested() ? 0 : this.failWith("verification failed");
      case "status":
        return this.statusRequested() ? 0 : 1;
      case "doctor":
        return this.doctorRequested() ? 0 : 1;
      case "update":
        return this.updateRequestedAction();
      case "uninstall":
        this.loadManifest();
        this.acquireLock();
        return this.uninstallRequested();
    }
  }

  private parseArguments(args: readonly string[]): ParsedArguments | number {
    if (args.length === 1 && (args[0] === "-h" || args[0] === "--help")) {
      this.writeStdout(USAGE.trimEnd());
      return 0;
    }
    if (args.length < 2) {
      this.writeStderr(USAGE.trimEnd());
      return 2;
    }

    const actionValue = args[0] ?? "";
    const requestedHarness = args[1] ?? "";
    if (actionValue === "-h" || actionValue === "--help") {
      this.writeStdout(USAGE.trimEnd());
      return 0;
    }
    if (
      actionValue !== "install" &&
      actionValue !== "verify" &&
      actionValue !== "status" &&
      actionValue !== "doctor" &&
      actionValue !== "update" &&
      actionValue !== "uninstall"
    ) {
      return this.failWith(`unknown action: ${actionValue}`);
    }

    const harness = requestedHarness === "claude-code" ? "claude" : requestedHarness;
    if (!adapterRegistryContains(this.sourceRoot, harness)) {
      return this.failWith(
        `unsupported harness: ${harness} (see .swe-forge/adapters/registry.tsv)`,
      );
    }

    let dryRun = false;
    for (let index = 2; index < args.length; index += 1) {
      const option = args[index] ?? "";
      switch (option) {
        case "--target":
          return this.failWith("--target is no longer supported; SWE Forge installations are user-level");
        case "--global":
          return this.failWith("--global is no longer supported; user-level installation is implicit");
        case "--mode":
          return this.failWith("--mode is no longer supported; installations always link to this checkout");
        case "--dry-run":
          if (actionValue !== "install" && actionValue !== "update") {
            return this.failWith("--dry-run is supported only for install and update");
          }
          dryRun = true;
          break;
        case "global":
        case "globally":
          return this.failWith("installation scope arguments are no longer supported; installation is user-level");
        case "-h":
        case "--help":
          this.writeStdout(USAGE.trimEnd());
          return 0;
        default:
          if (option.startsWith("-")) return this.failWith(`unknown option: ${option}`);
          return this.failWith(`unexpected argument: ${option} (project installation is no longer supported)`);
      }
    }

    return { action: actionValue, harness, dryRun };
  }

  private prepareManifests(): void {
    const supportRoot = join(this.sourceRoot, ".swe-forge");
    const excluded: Record<string, true> = {
      adapters: true,
      runs: true,
      ".runs": true,
      generated: true,
    };
    const directories: string[] = [];
    for (const name of this.fileSystem.readdir(supportRoot).sort()) {
      if (name.startsWith(".") || excluded[name] === true) continue;
      const path = join(supportRoot, name);
      try {
        if (this.fileSystem.stat(path).isDirectory()) directories.push(path);
      } catch {
        // The shell glob skips entries that disappear during discovery.
      }
    }
    this.canonicalDirectories = directories;
    this.rows = loadAdapterRows(this.sourceRoot, this.harness);
  }

  private validateHome(): void {
    const candidate = this.homeInput;
    if (candidate === undefined || candidate.length === 0) {
      throw new Error("HOME must be set for installation");
    }
    if (!candidate.startsWith("/")) throw new Error("HOME must be an absolute path for installation");
    rejectUnsupportedPath(candidate);
    if (!isRealDirectory(candidate, this.fileSystem)) {
      throw new Error(`HOME must be a real directory: ${candidate}`);
    }
    assertRealAncestors(`${candidate}/child`, this.fileSystem);
    this.home = this.fileSystem.realpath(candidate);
  }

  private manifestSupportRelative(): string {
    for (const row of this.rows) {
      if (row.support !== "-") return row.support;
    }
    throw new Error("adapter is missing a canonical support path");
  }

  private adapterDestination(relative: string): string {
    return `${this.home}/${relative}`;
  }

  private adapterSource(relative: string): string {
    return `${this.sourceRoot}/.swe-forge/adapters/${relative}`;
  }

  private buildManifestInventory(): readonly ManifestInventoryEntry[] {
    const support = this.manifestSupportRelative();
    const destinationRoot = this.adapterDestination(support);
    const entries: ManifestInventoryEntry[] = [];

    const add = (kind: ManifestEntry["kind"], source: string, destination: string): void => {
      rejectUnsupportedPath(destination);
      rejectUnsupportedPath(source);
      entries.push({
        kind,
        relative: manifestRelativePath(this.home, destination),
        source,
        linkTarget: source,
        destination,
      });
    };

    add("file", `${this.sourceRoot}/AGENTS.md`, `${destinationRoot}/AGENTS.md`);
    add("file", `${this.sourceRoot}/SWE-FORGE.md`, `${destinationRoot}/SWE-FORGE.md`);
    add("file", `${this.sourceRoot}/VERSION`, `${destinationRoot}/VERSION`);
    for (const sourceDirectory of this.canonicalDirectories) {
      const name = sourceDirectory.slice(sourceDirectory.lastIndexOf("/") + 1);
      add("dir", sourceDirectory, `${destinationRoot}/.swe-forge/${name}`);
    }

    for (const row of this.rows) {
      const source = this.adapterSource(row.source);
      const destination = this.adapterDestination(row.destination);
      add(row.kind === "file" ? "file" : "dir", source, destination);
    }
    return entries;
  }

  private preflightContainer(destination: string): void {
    assertRealAncestors(destination, this.fileSystem);
    if (pathExists(destination, this.fileSystem) && !isRealDirectory(destination, this.fileSystem)) {
      this.conflict(`${destination} must be a real directory`);
    }
  }

  private preflightFile(source: string, destination: string): void {
    assertRealAncestors(destination, this.fileSystem);
    if (!pathExists(destination, this.fileSystem)) return;
    if (samePath(source, destination, this.fileSystem)) return;
    if (isRealDirectory(destination, this.fileSystem)) {
      this.conflict(`${destination} exists as a directory`);
      return;
    }
    if (isSymlink(destination, this.fileSystem)) {
      this.conflict(`${destination} is a symlink to a different source`);
      return;
    }
    this.conflict(`${destination} exists as a regular file; remove it after review`);
  }

  private preflightDirectoryLink(source: string, destination: string): void {
    assertRealAncestors(destination, this.fileSystem);
    if (!pathExists(destination, this.fileSystem)) return;
    if (samePath(source, destination, this.fileSystem)) return;
    this.conflict(`${destination} already exists and is not linked to the SWE Forge source`);
  }

  private preflightCanonical(destinationRoot: string): void {
    this.preflightFile(`${this.sourceRoot}/AGENTS.md`, `${destinationRoot}/AGENTS.md`);
    this.preflightFile(`${this.sourceRoot}/SWE-FORGE.md`, `${destinationRoot}/SWE-FORGE.md`);
    this.preflightFile(`${this.sourceRoot}/VERSION`, `${destinationRoot}/VERSION`);
    this.preflightContainer(`${destinationRoot}/.swe-forge`);
    for (const sourceDirectory of this.canonicalDirectories) {
      const name = sourceDirectory.slice(sourceDirectory.lastIndexOf("/") + 1);
      this.preflightDirectoryLink(sourceDirectory, `${destinationRoot}/.swe-forge/${name}`);
    }
  }

  private preflightAdapterParents(base: string, relative: string): void {
    if (relative === ".") return;
    let current = base;
    for (const part of relative.split("/")) {
      if (part.length === 0) continue;
      current = `${current}/${part}`;
      this.preflightContainer(current);
    }
  }

  private preflightAdapterSupport(support: string): void {
    this.preflightAdapterParents(this.home, dirname(support));
    this.preflightCanonical(this.adapterDestination(support));
  }

  private preflightAdapterArtifact(row: AdapterRow): void {
    this.preflightAdapterParents(this.home, dirname(row.destination));
    const source = this.adapterSource(row.source);
    const destination = this.adapterDestination(row.destination);
    if (row.kind === "file") this.preflightFile(source, destination);
    else this.preflightDirectoryLink(source, destination);
  }

  private preflightInstall(): void {
    let conflicts = 0;
    const originalConflict = this.conflictCount;
    this.conflictCount = 0;
    try {
      const support = this.manifestSupportRelative();
      this.preflightAdapterSupport(support);
      for (const row of this.rows) this.preflightAdapterArtifact(row);
      conflicts = this.conflictCount;
    } finally {
      this.conflictCount = originalConflict;
    }
    if (conflicts !== 0) {
      throw new Error("installation stopped before writing; review the conflicts above");
    }
  }

  private conflictCount = 0;

  private conflict(message: string): void {
    this.writeStderr(`conflict: ${message}`);
    this.conflictCount += 1;
  }

  private verifyFailure(message: string): void {
    this.writeStderr(`FAIL: ${message}`);
    this.verifyFailures += 1;
  }

  private installFile(source: string, destination: string): void {
    if (pathExists(destination, this.fileSystem)) return;
    assertRealAncestors(destination, this.fileSystem);
    ensureDirectory(dirname(destination), this.home, this.fileSystem, this.transaction);
    this.transaction.runCritical(() => {
      try {
        this.fileSystem.symlink(source, destination);
      } catch {
        throw new Error(`could not install source link: ${destination}`);
      }
      this.transaction.recordCreatedFile(destination);
    });
  }

  private installDirectoryContainer(destination: string): void {
    ensureDirectory(destination, this.home, this.fileSystem, this.transaction);
  }

  private installDirectoryLink(source: string, destination: string): void {
    if (pathExists(destination, this.fileSystem)) return;
    assertRealAncestors(destination, this.fileSystem);
    ensureDirectory(dirname(destination), this.home, this.fileSystem, this.transaction);
    this.transaction.runCritical(() => {
      try {
        this.fileSystem.symlink(source, destination);
      } catch {
        throw new Error(`could not install source directory link: ${destination}`);
      }
      this.transaction.recordCreatedFile(destination);
    });
  }

  private installCanonical(destinationRoot: string): void {
    this.installFile(`${this.sourceRoot}/AGENTS.md`, `${destinationRoot}/AGENTS.md`);
    this.installFile(`${this.sourceRoot}/SWE-FORGE.md`, `${destinationRoot}/SWE-FORGE.md`);
    this.installFile(`${this.sourceRoot}/VERSION`, `${destinationRoot}/VERSION`);
    this.installDirectoryContainer(`${destinationRoot}/.swe-forge`);
    for (const sourceDirectory of this.canonicalDirectories) {
      const name = sourceDirectory.slice(sourceDirectory.lastIndexOf("/") + 1);
      this.installDirectoryLink(sourceDirectory, `${destinationRoot}/.swe-forge/${name}`);
    }
  }

  private installAdapterArtifact(row: AdapterRow): void {
    const source = this.adapterSource(row.source);
    const destination = this.adapterDestination(row.destination);
    if (row.kind === "file") this.installFile(source, destination);
    else this.installDirectoryLink(source, destination);
  }

  private installRequested(): void {
    this.installCanonical(this.adapterDestination(this.manifestSupportRelative()));
    for (const row of this.rows) this.installAdapterArtifact(row);
  }

  private verifyFile(source: string, destination: string): void {
    if (!pathExists(destination, this.fileSystem)) {
      this.verifyFailure(`${destination} is missing`);
      return;
    }
    if (!isSymlink(destination, this.fileSystem)) {
      this.verifyFailure(`${destination} is not a source link`);
    } else if (!samePath(source, destination, this.fileSystem)) {
      this.verifyFailure(`${destination} does not link to the current SWE Forge source`);
    }
  }

  private verifyDirectoryMapping(source: string, destination: string): void {
    if (!isSymlink(destination, this.fileSystem)) {
      this.verifyFailure(`${destination} is not a source directory link`);
    } else if (!samePath(source, destination, this.fileSystem)) {
      this.verifyFailure(`${destination} does not link to the current SWE Forge source`);
    }
  }

  private verifyCanonical(destinationRoot: string): void {
    this.verifyFile(`${this.sourceRoot}/AGENTS.md`, `${destinationRoot}/AGENTS.md`);
    this.verifyFile(`${this.sourceRoot}/SWE-FORGE.md`, `${destinationRoot}/SWE-FORGE.md`);
    this.verifyFile(`${this.sourceRoot}/VERSION`, `${destinationRoot}/VERSION`);
    const supportRoot = `${destinationRoot}/.swe-forge`;
    if (!pathExists(supportRoot, this.fileSystem) || !isRealDirectory(supportRoot, this.fileSystem)) {
      this.verifyFailure(`${supportRoot} must be a real directory`);
      return;
    }
    for (const sourceDirectory of this.canonicalDirectories) {
      const name = sourceDirectory.slice(sourceDirectory.lastIndexOf("/") + 1);
      this.verifyDirectoryMapping(sourceDirectory, `${supportRoot}/${name}`);
    }
  }

  private verifyAdapterArtifact(row: AdapterRow): void {
    const source = this.adapterSource(row.source);
    const destination = this.adapterDestination(row.destination);
    if (row.kind === "file") this.verifyFile(source, destination);
    else this.verifyDirectoryMapping(source, destination);
  }

  private verifyRequested(): boolean {
    this.verifyFailures = 0;
    this.verifyCanonical(this.adapterDestination(this.manifestSupportRelative()));
    for (const row of this.rows) this.verifyAdapterArtifact(row);
    if (this.verifyFailures !== 0) return false;
    this.info(`PASS: SWE Forge ${this.harness} installation is valid`);
    return true;
  }

  private sourceVersion(): string {
    try {
      const contents = this.fileSystem.readFile(`${this.sourceRoot}/VERSION`);
      const firstLine = contents.split("\n")[0] ?? "";
      return firstLine.length === 0 ? "unknown" : firstLine;
    } catch {
      return "unknown";
    }
  }

  private sourceCommit(): string {
    const result = runCommand(["git", "-C", this.sourceRoot, "rev-parse", "--short", "HEAD"]);
    if (result.exitCode !== 0) return "unknown";
    const commit = stripTrailingNewlines(result.stdout);
    return commit.length === 0 ? "unknown" : commit;
  }

  private sourceTreeState(): "clean" | "dirty" {
    const diff = runCommand(["git", "-C", this.sourceRoot, "diff", "--quiet", "--ignore-submodules", "--"]);
    if (diff.exitCode !== 0) return "dirty";
    const status = runCommand([
      "git",
      "-C",
      this.sourceRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]);
    return status.exitCode === 0 && stripTrailingNewlines(status.stdout).length === 0 ? "clean" : "dirty";
  }

  private printVersion(): void {
    this.info(`SWE Forge version: ${this.sourceVersion()}`);
    this.info(`source: ${this.sourceRoot}`);
    this.info(`commit: ${this.sourceCommit()}`);
    this.info(`worktree: ${this.sourceTreeState()}`);
  }

  private statusRequested(): boolean {
    this.info(`source: ${this.sourceRoot}`);
    this.info(`version: ${this.sourceVersion()}`);
    this.info(`commit: ${this.sourceCommit()}`);
    this.info(`source state: ${this.sourceTreeState()}`);
    this.info(`harness: ${this.harness}`);
    this.info(`home: ${this.home}`);

    const paths = this.requirePaths();
    if (pathExists(paths.path, this.fileSystem) && isRegularFile(paths.path, this.fileSystem)) {
      try {
        const document = validateManifest(paths, this.harness, this.fileSystem);
        this.info(`manifest: ${paths.path}`);
        this.info(`managed paths: ${document.entries.length}`);
        for (const entry of document.entries) {
          this.info(`managed: ${manifestEntryDestination(paths, entry.relative)}`);
        }
        this.info(`manifest source version: ${document.metadata.source_version ?? ""}`);
        this.info(`manifest source commit: ${document.metadata.source_commit ?? ""}`);
      } catch {
        this.info(`manifest: INVALID (${paths.path})`);
      }
    } else {
      this.info("manifest: missing (unmanaged installation; destructive lifecycle operations refuse)");
    }

    if (this.verifyRequested()) {
      this.info("verification: PASS");
      return true;
    }
    this.info("verification: FAIL");
    return false;
  }

  private doctorRequested(): boolean {
    let doctorStatus = 0;
    if (!this.statusRequested()) doctorStatus = 1;
    if (this.sourceTreeState() === "dirty") {
      this.info("doctor: source checkout has uncommitted changes; review before updating installations");
    }

    const paths = this.requirePaths();
    if (!pathExists(paths.path, this.fileSystem)) {
      this.info("doctor: no managed manifest; recreate the installation before update or uninstall");
      doctorStatus = 1;
    } else {
      try {
        validateManifest(paths, this.harness, this.fileSystem);
      } catch {
        this.info("doctor: managed manifest is invalid or unsafe");
        doctorStatus = 1;
      }
    }
    if (doctorStatus === 0) {
      this.info("doctor: PASS");
      return true;
    }
    this.info("doctor: ACTION REQUIRED");
    return false;
  }

  private acquireLock(): void {
    this.lockDirectory = `${this.home}/.swe-forge-install.lock`;
    assertRealAncestors(this.lockDirectory, this.fileSystem);
    this.transaction.runCritical(() => {
      try {
        this.fileSystem.mkdir(this.lockDirectory);
      } catch {
        throw new Error(
          `another installation may be active; remove stale lock after review: ${this.lockDirectory}`,
        );
      }
      this.lockOwned = true;
    });
  }

  private releaseLock(): void {
    if (!this.lockOwned) return;
    try {
      this.fileSystem.rmdir(this.lockDirectory);
    } catch {
      // A non-empty or externally changed lock is left in place.
    }
    this.lockOwned = false;
  }

  private requirePaths(): ManifestPaths {
    if (this.paths === undefined) throw new Error("manifest paths were not initialized");
    return this.paths;
  }

  private loadManifest(): ManifestDocument | undefined {
    const paths = this.requirePaths();
    if (pathExists(paths.path, this.fileSystem)) {
      const document = validateManifest(paths, this.harness, this.fileSystem);
      return document;
    }
    if (this.action === "update" || this.action === "uninstall") {
      throw new Error(`no managed installation manifest found; refusing destructive ${this.action}`);
    }
    return undefined;
  }

  private installRequestedAction(): number {
    this.loadManifest();
    if (this.dryRun) {
      this.preflightInstall();
      this.installDryRun();
      return 0;
    }
    this.acquireLock();
    this.preflightInstall();
    const inventory = this.buildManifestInventory();
    this.transaction.active = true;
    this.installRequested();
    if (!this.verifyRequested()) throw new Error("installation completed but verification failed");
    writeManifest({
      paths: this.requirePaths(),
      sourceRoot: this.sourceRoot,
      sourceVersion: this.sourceVersion(),
      sourceCommit: this.sourceCommit(),
      harness: this.harness,
      entries: inventory,
      fs: this.fileSystem,
      transaction: this.transaction,
    });
    this.transaction.active = false;
    this.info(`source: ${this.sourceRoot}`);
    this.info("installation: user harness configuration");
    this.info(`home: ${this.home}`);
    this.info(`manifest: ${this.requirePaths().path}`);
    this.info("invoke with: see the selected harness adapter README");
    return 0;
  }

  private installDryRun(): void {
    const inventory = this.buildManifestInventory();
    this.info("dry-run: no files, links, locks, or manifests will be changed");
    for (const entry of inventory) this.info(`would manage: ${entry.destination}`);
  }

  private updateRequestedAction(): number {
    this.loadManifest();
    if (!this.dryRun) this.acquireLock();
    return this.updateRequested();
  }

  private updateRequested(): number {
    const manifest = this.loadManifest();
    if (manifest === undefined) throw new Error("managed installation manifest is missing");
    const inventory = this.buildManifestInventory();
    const plan = this.buildUpdatePlan(manifest, inventory);
    if (this.dryRun) {
      this.info("dry-run: no files, links, locks, or manifests will be changed");
      this.printUpdatePlan(plan);
      return 0;
    }

    this.transaction.active = true;
    this.executeUpdatePlan(plan);
    if (!this.verifyRequested()) throw new Error("updated installation failed verification");
    writeManifest({
      paths: this.requirePaths(),
      sourceRoot: this.sourceRoot,
      sourceVersion: this.sourceVersion(),
      sourceCommit: this.sourceCommit(),
      harness: this.harness,
      entries: inventory,
      fs: this.fileSystem,
      transaction: this.transaction,
    });
    this.transaction.active = false;
    this.info(`updated: ${this.requirePaths().path}`);
    this.info(`source version: ${this.sourceVersion()}`);
    return 0;
  }

  private buildUpdatePlan(
    manifest: ManifestDocument,
    inventory: readonly ManifestInventoryEntry[],
  ): readonly UpdatePlanEntry[] {
    const plan: UpdatePlanEntry[] = [];
    for (const entry of inventory) {
      const destination = manifestEntryDestination(this.requirePaths(), entry.relative);
      let action: UpdatePlanEntry["action"];
      if (!pathExists(destination, this.fileSystem)) {
        action = "add";
      } else if (!isSymlink(destination, this.fileSystem)) {
        throw new Error(`managed link was replaced by a non-link: ${destination}`);
      } else {
        const currentTarget = this.fileSystem.readlink(destination);
        if (currentTarget !== entry.linkTarget) {
          const oldTarget = manifestEntryTarget(manifest, entry.relative);
          if (currentTarget !== oldTarget) throw new Error(`managed link was modified: ${destination}`);
          action = "relink";
        } else {
          action = "noop";
        }
      }
      plan.push({
        action,
        kind: entry.kind,
        relative: entry.relative,
        source: entry.source,
        target: entry.linkTarget,
      });
    }

    for (const entry of manifest.entries) {
      if (manifestContainsRelative(inventory, entry.relative)) continue;
      const destination = manifestEntryDestination(this.requirePaths(), entry.relative);
      if (!pathExists(destination, this.fileSystem)) continue;
      if (!isSymlink(destination, this.fileSystem)) {
        throw new Error(`stale managed entry is not a link: ${destination}`);
      }
      if (this.fileSystem.readlink(destination) !== entry.linkTarget) {
        throw new Error(`stale managed link was modified: ${destination}`);
      }
      plan.push({
        action: "remove",
        kind: entry.kind,
        relative: entry.relative,
        source: entry.source,
        target: entry.linkTarget,
      });
    }
    return plan;
  }

  private printUpdatePlan(plan: readonly UpdatePlanEntry[]): void {
    let actions = 0;
    for (const entry of plan) {
      if (entry.action === "noop") continue;
      actions += 1;
      this.info(`would ${entry.action}: ${manifestEntryDestination(this.requirePaths(), entry.relative)}`);
    }
    if (actions === 0) this.info("would do nothing: installation is current");
  }

  private executeUpdatePlan(plan: readonly UpdatePlanEntry[]): void {
    for (const entry of plan) {
      const destination = manifestEntryDestination(this.requirePaths(), entry.relative);
      switch (entry.action) {
        case "noop":
          break;
        case "add":
          if (entry.kind === "file") this.installFile(entry.source, destination);
          else this.installDirectoryLink(entry.source, destination);
          break;
        case "relink":
          this.transaction.recordRemovedLink(destination);
          this.fileSystem.unlink(destination);
          if (entry.kind === "file") this.installFile(entry.source, destination);
          else this.installDirectoryLink(entry.source, destination);
          break;
        case "remove":
          this.transaction.recordRemovedLink(destination);
          this.fileSystem.unlink(destination);
          break;
      }
    }
  }

  private findManifestFiles(directory: string): readonly string[] {
    if (!pathExists(directory, this.fileSystem) || !isRealDirectory(directory, this.fileSystem)) return [];
    const files: string[] = [];
    for (const name of this.fileSystem.readdir(directory)) {
      const path = `${directory}/${name}`;
      if (isSymlink(path, this.fileSystem)) continue;
      if (isRealDirectory(path, this.fileSystem)) {
        files.push(...this.findManifestFiles(path));
      } else if (name.endsWith(".tsv") && isRegularFile(path, this.fileSystem)) {
        files.push(path);
      }
    }
    return files;
  }

  private manifestIsShared(relative: string): boolean {
    const paths = this.requirePaths();
    for (const path of this.findManifestFiles(paths.directory)) {
      if (path === paths.path) continue;
      if (manifestFileContainsRelative(path, relative, this.fileSystem)) return true;
    }
    return false;
  }

  private uninstallRequested(): number {
    const manifest = this.loadManifest();
    if (manifest === undefined) throw new Error("managed installation manifest is missing");

    let removeCount = 0;
    for (const entry of manifest.entries) {
      const destination = manifestEntryDestination(this.requirePaths(), entry.relative);
      if (!pathExists(destination, this.fileSystem)) {
        this.info(`already absent: ${destination}`);
        continue;
      }
      if (!isSymlink(destination, this.fileSystem)) {
        throw new Error(`managed link is no longer a link; refusing uninstall: ${destination}`);
      }
      if (this.fileSystem.readlink(destination) !== entry.linkTarget) {
        throw new Error(`managed link was modified; refusing uninstall: ${destination}`);
      }
      if (this.manifestIsShared(entry.relative)) {
        this.info(`keep shared entry: ${destination}`);
      } else {
        removeCount += 1;
      }
    }

    const paths = this.requirePaths();
    const stats = this.fileSystem.stat(paths.path);
    this.transaction.recordManifestExisting(paths.path, this.fileSystem.readFile(paths.path), stats.mode);
    this.transaction.active = true;
    for (const entry of manifest.entries) {
      const destination = manifestEntryDestination(paths, entry.relative);
      if (!pathExists(destination, this.fileSystem)) continue;
      if (this.manifestIsShared(entry.relative)) continue;
      this.transaction.recordRemovedLink(destination);
      this.fileSystem.unlink(destination);
    }
    this.fileSystem.unlink(paths.path);
    try {
      this.fileSystem.rmdir(paths.directory);
    } catch {
      // Other harness manifests or unrelated files keep the state directory.
    }
    this.transaction.active = false;
    this.info(`uninstalled: ${this.harness}`);
    this.info(`removed managed entries: ${removeCount}`);
    return 0;
  }

  private failWith(message: string): never {
    throw new Error(message);
  }

  private info(message: string): void {
    this.writeStdout(message);
  }
}

export function runInstaller(args: readonly string[] = process.argv.slice(2), options: InstallerOptions = {}): number {
  const installer = new Installer(options);
  const signalHandlers: ReadonlyArray<readonly [NodeJS.Signals, () => void]> = options.handleSignals
    ? [
        ["SIGHUP", () => installer.handleSignal(129)],
        ["SIGINT", () => installer.handleSignal(130)],
        ["SIGTERM", () => installer.handleSignal(143)],
      ]
    : [];
  for (const [signal, handler] of signalHandlers) process.on(signal, handler);

  try {
    return installer.execute(args);
  } catch (error) {
    if (error instanceof InstallSignal) return error.status;
    const message = error instanceof Error ? error.message : String(error);
    installer.abort();
    const writeError = options.stderr ?? ((line: string) => process.stderr.write(`${line}\n`));
    writeError(`error: ${message}`);
    return 1;
  } finally {
    for (const [signal, handler] of signalHandlers) process.off(signal, handler);
  }
}
