import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface InstallFileSystem {
  readonly lstat: (path: string) => Stats;
  readonly stat: (path: string) => Stats;
  readonly readlink: (path: string) => string;
  readonly realpath: (path: string) => string;
  readonly readdir: (path: string) => string[];
  readonly mkdir: (path: string) => void;
  readonly symlink: (target: string, path: string) => void;
  readonly unlink: (path: string) => void;
  readonly rmdir: (path: string) => void;
  readonly readFile: (path: string) => string;
  readonly writeFile: (path: string, contents: string) => void;
  readonly rename: (oldPath: string, newPath: string) => void;
  readonly chmod: (path: string, mode: number) => void;
}

export const nativeInstallFileSystem: InstallFileSystem = {
  lstat: lstatSync,
  stat: statSync,
  readlink: readlinkSync,
  realpath: realpathSync,
  readdir: (path) => readdirSync(path, { encoding: "utf8" }) as string[],
  mkdir: (path) => mkdirSync(path),
  symlink: (target, path) => symlinkSync(target, path),
  unlink: (path) => unlinkSync(path),
  rmdir: (path) => rmdirSync(path),
  readFile: (path) => readFileSync(path, "utf8"),
  writeFile: (path, contents) => writeFileSync(path, contents),
  rename: (oldPath, newPath) => renameSync(oldPath, newPath),
  chmod: (path, mode) => chmodSync(path, mode),
};

export function pathExists(path: string, fs: InstallFileSystem = nativeInstallFileSystem): boolean {
  try {
    fs.lstat(path);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
    }
    throw error;
  }
}

export function isSymlink(path: string, fs: InstallFileSystem = nativeInstallFileSystem): boolean {
  try {
    return fs.lstat(path).isSymbolicLink();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
    }
    throw error;
  }
}

export function isRealDirectory(path: string, fs: InstallFileSystem = nativeInstallFileSystem): boolean {
  if (isSymlink(path, fs)) return false;
  try {
    return fs.stat(path).isDirectory();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
    }
    throw error;
  }
}

export function isRegularFile(path: string, fs: InstallFileSystem = nativeInstallFileSystem): boolean {
  if (isSymlink(path, fs)) return false;
  try {
    return fs.stat(path).isFile();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "ENOENT" || code === "ENOTDIR") return false;
    }
    throw error;
  }
}

export function assertRealAncestors(path: string, fs: InstallFileSystem = nativeInstallFileSystem): void {
  let current = dirname(path);
  while (current !== "/" && current !== ".") {
    if (isSymlink(current, fs)) {
      throw new Error(`destination path contains a symlinked directory: ${current}`);
    }
    current = dirname(current);
  }
}

export function resolvePath(
  path: string,
  fs: InstallFileSystem = nativeInstallFileSystem,
): string | undefined {
  let current = path;
  let count = 0;

  while (isSymlink(current, fs)) {
    count += 1;
    if (count >= 40) return undefined;
    const target = fs.readlink(current);
    current = target.startsWith("/") ? target : join(dirname(current), target);
  }

  try {
    if (fs.stat(current).isDirectory()) return fs.realpath(current);
    return `${fs.realpath(dirname(current))}/${basename(current)}`;
  } catch {
    return undefined;
  }
}

export function samePath(
  first: string,
  second: string,
  fs: InstallFileSystem = nativeInstallFileSystem,
): boolean {
  const firstResolved = resolvePath(first, fs);
  const secondResolved = resolvePath(second, fs);
  return firstResolved !== undefined && secondResolved !== undefined && firstResolved === secondResolved;
}

export class InstallSignal extends Error {
  public constructor(public readonly status: number) {
    super(`installer interrupted with status ${status}`);
    this.name = "InstallSignal";
  }
}

export class InstallTransaction {
  active = false;
  private readonly createdFiles: string[] = [];
  private readonly createdDirectories: string[] = [];
  private readonly removedLinks: Array<{ path: string; target: string }> = [];
  private manifestState:
    | { path: string; existed: true; contents?: string; mode?: number }
    | { path: string; existed: false; published: boolean }
    | undefined;
  private criticalDepth = 0;
  private pendingSignal: number | undefined;

  public constructor(private readonly fs: InstallFileSystem = nativeInstallFileSystem) {}

  public runCritical<T>(operation: () => T): T {
    this.criticalDepth += 1;
    try {
      return operation();
    } finally {
      this.criticalDepth -= 1;
      if (this.criticalDepth === 0 && this.pendingSignal !== undefined) {
        const signal = this.pendingSignal;
        this.pendingSignal = undefined;
        throw new InstallSignal(signal);
      }
    }
  }

  public deferSignal(status: number): void {
    if (this.criticalDepth > 0) {
      this.pendingSignal = status;
      return;
    }
    throw new InstallSignal(status);
  }

  public get inCriticalSection(): boolean {
    return this.criticalDepth > 0;
  }

  public recordCreatedFile(path: string): void {
    this.createdFiles.push(path);
  }

  public recordCreatedDirectory(path: string): void {
    this.createdDirectories.push(path);
  }

  public recordRemovedLink(path: string): void {
    this.removedLinks.push({ path, target: this.fs.readlink(path) });
  }

  public recordManifestExisting(path: string, contents: string, mode: number): void {
    this.manifestState = { path, existed: true, contents, mode };
  }

  public protectManifestPath(path: string): void {
    this.manifestState = { path, existed: true };
  }

  public recordManifestNew(path: string): void {
    this.manifestState = { path, existed: false, published: false };
  }

  public markManifestPublished(): void {
    if (this.manifestState?.existed === false) this.manifestState.published = true;
  }

  public rollback(): void {
    for (const path of this.createdFiles) this.removePath(path);

    for (const link of this.removedLinks) {
      if (!pathExists(link.path, this.fs)) {
        try {
          this.fs.symlink(link.target, link.path);
        } catch {
          // Rollback is best effort.
        }
      }
    }
    if (
      this.manifestState?.existed &&
      this.manifestState.contents !== undefined &&
      this.manifestState.mode !== undefined
    ) {
      try {
        this.fs.writeFile(this.manifestState.path, this.manifestState.contents);
        this.fs.chmod(this.manifestState.path, this.manifestState.mode);
      } catch {
        // Rollback is best effort.
      }
    } else if (this.manifestState?.existed === false && this.manifestState.published) {
      this.removePath(this.manifestState.path);
    }

    const directories = [...this.createdDirectories].sort().reverse();
    for (const path of directories) {
      try {
        this.fs.rmdir(path);
      } catch {
        // A non-empty or externally changed directory is left in place.
      }
    }
  }

  private removePath(path: string): void {
    try {
      this.fs.unlink(path);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "ENOENT" || code === "ENOTDIR") return;
      }
      // Ignore cleanup failures during rollback.
    }
  }
}

export function ensureDirectory(
  target: string,
  home: string,
  fs: InstallFileSystem,
  transaction: InstallTransaction,
): void {
  assertRealAncestors(target, fs);

  let relative: string;
  if (target === home) return;
  if (home === "/" && target.startsWith("/")) {
    relative = target.slice(1);
  } else if (target.startsWith(`${home}/`)) {
    relative = target.slice(home.length + 1);
  } else {
    throw new Error(`managed directory escapes user home: ${target}`);
  }

  let current = home;
  for (const part of relative.split("/")) {
    if (part.length === 0) continue;
    current = current === "/" ? `/${part}` : `${current}/${part}`;
    if (pathExists(current, fs)) {
      if (!isRealDirectory(current, fs)) throw new Error(`${current} must be a real directory`);
      continue;
    }
    transaction.runCritical(() => {
      fs.mkdir(current);
      transaction.recordCreatedDirectory(current);
    });
  }
}
