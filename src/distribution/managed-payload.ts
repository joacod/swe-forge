import { randomUUID } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import type { EmbeddedPayload } from "./embedded-payload";

export interface ManagedReleaseFileSystem {
  readonly lstat: (path: string) => Stats;
  readonly readlink: (path: string) => string;
  readonly readdir: (path: string) => string[];
  readonly mkdir: (path: string) => void;
  readonly rename: (oldPath: string, newPath: string) => void;
  readonly symlink: (target: string, path: string) => void;
  readonly unlink: (path: string) => void;
  readonly rmdir: (path: string) => void;
  readonly readFile: (path: string) => Uint8Array;
  readonly writeFile: (path: string, contents: Uint8Array) => void;
}

export const nativeManagedReleaseFileSystem: ManagedReleaseFileSystem = {
  lstat: lstatSync,
  readlink: readlinkSync,
  readdir: (path) => readdirSync(path, { encoding: "utf8" }) as string[],
  mkdir: (path) => mkdirSync(path),
  rename: renameSync,
  symlink: symlinkSync,
  unlink: unlinkSync,
  rmdir: rmdirSync,
  readFile: readFileSync,
  writeFile: writeFileSync,
};

export interface ManagedReleaseLayout {
  readonly dataRoot: string;
  readonly root: string;
  readonly versions: string;
  readonly current: string;
}

export interface MaterializeEmbeddedReleaseOptions {
  /** Parent of the managed `$DATA_ROOT/swe-forge` directory. */
  readonly dataRoot?: string;
  /** Publish the stable `current` pointer after the version is materialized. */
  readonly activate?: boolean;
  readonly fileSystem?: ManagedReleaseFileSystem;
}

export interface MaterializedEmbeddedRelease {
  readonly layout: ManagedReleaseLayout;
  readonly version: string;
  readonly versionPath: string;
  readonly canonicalPath: string;
  readonly published: boolean;
  readonly reused: boolean;
  readonly activated: boolean;
  readonly activeVersion?: string;
}

interface ReleaseAsset {
  readonly path: string;
  readonly bytes: Uint8Array;
}

interface ExpectedFile {
  readonly kind: "file";
  readonly bytes: Uint8Array;
}

interface ExpectedDirectory {
  readonly kind: "directory";
  readonly children: Map<string, ExpectedNode>;
}

type ExpectedNode = ExpectedFile | ExpectedDirectory;

const MANAGED_DIRECTORY_NAME = "swe-forge";
const VERSIONS_DIRECTORY_NAME = "versions";
const CURRENT_NAME = "current";
const CANONICAL_DIRECTORY_NAME = "canonical";
const VERSION_PATH = "VERSION";
const VERSION_COMPONENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/u;
const MAX_PATH_COMPONENT_LENGTH = 255;

function fail(message: string): never {
  throw new Error(`managed release: ${message}`);
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { readonly code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function isMissingError(error: unknown): boolean {
  return errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR";
}

function pathExists(path: string, fs: ManagedReleaseFileSystem): boolean {
  try {
    fs.lstat(path);
    return true;
  } catch (error) {
    if (isMissingError(error)) return false;
    throw error;
  }
}

function assertPathText(path: string, label: string): void {
  if (
    path.length === 0 ||
    path.includes("\0") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(path)
  ) {
    fail(`${label} contains unsupported characters: ${path}`);
  }
}

function assertAbsoluteDataRoot(path: string): void {
  assertPathText(path, "data root");
  if (!isAbsolute(path)) fail(`data root must be an absolute path: ${path}`);
  if (path === "/") fail("data root must not be filesystem root");

  const parts = path.split("/");
  if (parts.at(-1) === "") fail(`data root must not have a trailing separator: ${path}`);
  for (const [index, part] of parts.entries()) {
    if (index === 0 && part === "") continue;
    if (part.length === 0 || part === "." || part === "..") {
      fail(`data root contains an unsafe path component: ${path}`);
    }
    if (part.length > MAX_PATH_COMPONENT_LENGTH) {
      fail(`data root contains an oversized path component: ${part}`);
    }
  }
}

function assertAssetPath(path: string): readonly string[] {
  assertPathText(path, "embedded asset path");
  if (path.startsWith("/") || path.endsWith("/")) fail(`embedded asset path is unsafe: ${path}`);

  const parts = path.split("/");
  for (const part of parts) {
    if (
      part.length === 0 ||
      part === "." ||
      part === ".." ||
      part.length > MAX_PATH_COMPONENT_LENGTH
    ) {
      fail(`embedded asset path is unsafe: ${path}`);
    }
  }
  return parts;
}

function assertVersionComponent(version: string): void {
  assertPathText(version, "embedded release version");
  if (
    version.length > MAX_PATH_COMPONENT_LENGTH ||
    !VERSION_COMPONENT_PATTERN.test(version) ||
    version === "." ||
    version === ".."
  ) {
    fail(`embedded release version is not a safe path component: ${version}`);
  }
}

function compareStrings(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function assertRealDirectory(path: string, label: string, fs: ManagedReleaseFileSystem): void {
  let stats: Stats;
  try {
    stats = fs.lstat(path);
  } catch (error) {
    if (isMissingError(error)) fail(`${label} is missing: ${path}`);
    throw error;
  }
  if (stats.isSymbolicLink()) fail(`${label} must be a real directory: ${path}`);
  if (!stats.isDirectory()) fail(`${label} must be a real directory: ${path}`);
}

function assertRealAncestors(path: string, fs: ManagedReleaseFileSystem): void {
  let current = dirname(path);
  while (current !== "/" && current !== ".") {
    try {
      const stats = fs.lstat(current);
      if (stats.isSymbolicLink()) fail(`path contains a symlinked directory: ${current}`);
      if (!stats.isDirectory()) fail(`path ancestor must be a real directory: ${current}`);
    } catch (error) {
      if (!isMissingError(error)) throw error;
    }
    current = dirname(current);
  }
}

function ensureRealDirectory(path: string, label: string, fs: ManagedReleaseFileSystem): void {
  assertRealAncestors(path, fs);

  const missing: string[] = [];
  let current = path;
  while (current !== "/") {
    try {
      const stats = fs.lstat(current);
      if (stats.isSymbolicLink()) fail(`${label} must be a real directory: ${current}`);
      if (!stats.isDirectory()) fail(`${label} must be a real directory: ${current}`);
      break;
    } catch (error) {
      if (!isMissingError(error)) throw error;
      missing.push(current);
      current = dirname(current);
    }
  }

  for (const directory of missing.reverse()) {
    assertRealAncestors(directory, fs);
    try {
      fs.mkdir(directory);
    } catch (error) {
      throw new Error(`could not create ${label}: ${directory}`, { cause: error });
    }
    assertRealDirectory(directory, label, fs);
  }
}

function assertManagedRootInventory(layout: ManagedReleaseLayout, fs: ManagedReleaseFileSystem): void {
  ensureRealDirectory(layout.root, "managed release root", fs);
  for (const name of fs.readdir(layout.root)) {
    if (name !== VERSIONS_DIRECTORY_NAME && name !== CURRENT_NAME) {
      fail(`managed release root contains an unexpected entry: ${name}`);
    }
  }

  const currentExists = pathExists(layout.current, fs);
  if (currentExists && !fs.lstat(layout.current).isSymbolicLink()) {
    fail(`current must be a symlink: ${layout.current}`);
  }
  ensureRealDirectory(layout.versions, "managed versions directory", fs);
}

function newExpectedDirectory(): ExpectedDirectory {
  return { kind: "directory", children: new Map() };
}

function buildExpectedTree(assets: readonly ReleaseAsset[]): ExpectedDirectory {
  const root = newExpectedDirectory();
  for (const asset of assets) {
    const parts = assertAssetPath(asset.path);
    let directory = root;
    for (const [index, part] of parts.entries()) {
      const isFile = index === parts.length - 1;
      const existing = directory.children.get(part);
      if (isFile) {
        if (existing !== undefined) fail(`embedded asset inventory has a path conflict: ${asset.path}`);
        directory.children.set(part, { kind: "file", bytes: asset.bytes });
        continue;
      }

      if (existing !== undefined && existing.kind === "file") {
        fail(`embedded asset inventory has a file ancestor: ${asset.path}`);
      }
      if (existing === undefined) {
        const child = newExpectedDirectory();
        directory.children.set(part, child);
        directory = child;
      } else {
        directory = existing;
      }
    }
  }
  return root;
}

function bytesEqual(actual: Uint8Array, expected: Uint8Array): boolean {
  if (actual.byteLength !== expected.byteLength) return false;
  for (let index = 0; index < actual.byteLength; index += 1) {
    if (actual[index] !== expected[index]) return false;
  }
  return true;
}

function verifyExpectedDirectory(
  path: string,
  logicalPath: string,
  expected: ExpectedDirectory,
  fs: ManagedReleaseFileSystem,
): void {
  assertRealDirectory(path, "published release directory", fs);
  const actualNames = fs.readdir(path).sort(compareStrings);
  const actualNamesSet = new Set(actualNames);

  for (const name of actualNames) {
    const node = expected.children.get(name);
    const childPath = join(path, name);
    const childLogicalPath = `${logicalPath}/${name}`;
    if (node === undefined) fail(`published release has an extra entry: ${childLogicalPath}`);

    if (node.kind === "directory") {
      verifyExpectedDirectory(childPath, childLogicalPath, node, fs);
      continue;
    }

    let stats: Stats;
    try {
      stats = fs.lstat(childPath);
    } catch (error) {
      if (isMissingError(error)) fail(`published release is missing: ${childLogicalPath}`);
      throw error;
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      fail(`published release entry is not a regular file: ${childLogicalPath}`);
    }
    if (!bytesEqual(fs.readFile(childPath), node.bytes)) {
      fail(`published release entry has incorrect content: ${childLogicalPath}`);
    }
  }

  for (const name of expected.children.keys()) {
    if (!actualNamesSet.has(name)) fail(`published release is missing: ${logicalPath}/${name}`);
  }
}

function verifyExactVersion(
  versionPath: string,
  version: string,
  expected: ExpectedDirectory,
  fs: ManagedReleaseFileSystem,
): void {
  verifyExpectedDirectory(versionPath, `versions/${version}`, expected, fs);
}

function versionFromBytes(bytes: Uint8Array): string {
  const firstLine = new TextDecoder().decode(bytes).split("\n")[0] ?? "";
  assertVersionComponent(firstLine);
  return firstLine;
}

function verifyVersionShape(versionPath: string, version: string, fs: ManagedReleaseFileSystem): void {
  assertRealDirectory(versionPath, "managed release version", fs);
  const names = fs.readdir(versionPath).sort(compareStrings);
  if (names.length !== 1 || names[0] !== CANONICAL_DIRECTORY_NAME) {
    fail(`managed release version has an unexpected inventory: ${versionPath}`);
  }

  const canonicalPath = join(versionPath, CANONICAL_DIRECTORY_NAME);
  assertRealDirectory(canonicalPath, "managed canonical directory", fs);
  const versionFile = join(canonicalPath, VERSION_PATH);
  let stats: Stats;
  try {
    stats = fs.lstat(versionFile);
  } catch (error) {
    if (isMissingError(error)) fail(`managed release version is missing VERSION: ${versionPath}`);
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    fail(`managed release VERSION must be a regular file: ${versionFile}`);
  }
  if (versionFromBytes(fs.readFile(versionFile)) !== version) {
    fail(`managed release VERSION does not match its directory: ${versionPath}`);
  }
  verifyRealTree(canonicalPath, fs);
}

function verifyRealTree(path: string, fs: ManagedReleaseFileSystem): void {
  assertRealDirectory(path, "managed release directory", fs);
  for (const name of fs.readdir(path)) {
    const child = join(path, name);
    const stats = fs.lstat(child);
    if (stats.isSymbolicLink()) fail(`managed release contains a symlink: ${child}`);
    if (stats.isDirectory()) verifyRealTree(child, fs);
    else if (!stats.isFile()) fail(`managed release contains a non-regular entry: ${child}`);
  }
}

function parseCurrentTarget(target: string): string {
  assertPathText(target, "current target");
  const parts = target.split("/");
  if (parts.length !== 2 || parts[0] !== VERSIONS_DIRECTORY_NAME) {
    fail(`current target is outside the managed versions directory: ${target}`);
  }
  const version = parts[1] ?? "";
  assertVersionComponent(version);
  return version;
}

function inspectCurrent(layout: ManagedReleaseLayout, fs: ManagedReleaseFileSystem): string | undefined {
  if (!pathExists(layout.current, fs)) return undefined;
  const stats = fs.lstat(layout.current);
  if (!stats.isSymbolicLink()) fail(`current must be a symlink: ${layout.current}`);
  const version = parseCurrentTarget(fs.readlink(layout.current));
  verifyVersionShape(join(layout.versions, version), version, fs);
  return version;
}

function temporaryPath(parent: string, prefix: string, fs: ManagedReleaseFileSystem): string {
  const path = join(parent, `${prefix}${process.pid}-${randomUUID()}`);
  assertRealAncestors(path, fs);
  if (pathExists(path, fs)) fail(`temporary materialization path already exists: ${path}`);
  return path;
}

function removeOwnedTree(path: string, fs: ManagedReleaseFileSystem): void {
  if (!pathExists(path, fs)) return;
  const stats = fs.lstat(path);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    fs.unlink(path);
    return;
  }
  for (const name of fs.readdir(path)) removeOwnedTree(join(path, name), fs);
  fs.rmdir(path);
}

function switchCurrent(
  layout: ManagedReleaseLayout,
  version: string,
  fs: ManagedReleaseFileSystem,
): void {
  const target = `${VERSIONS_DIRECTORY_NAME}/${version}`;
  const temporary = temporaryPath(layout.root, ".current-", fs);
  try {
    fs.symlink(target, temporary);
    fs.rename(temporary, layout.current);
  } finally {
    if (pathExists(temporary, fs)) removeOwnedTree(temporary, fs);
  }

  if (!fs.lstat(layout.current).isSymbolicLink() || fs.readlink(layout.current) !== target) {
    fail(`current publication did not produce the expected target: ${layout.current}`);
  }
}

async function readEmbeddedRelease(payload: EmbeddedPayload): Promise<{
  readonly version: string;
  readonly assets: readonly ReleaseAsset[];
  readonly expectedTree: ExpectedDirectory;
}> {
  await payload.validate();
  const paths = [...payload.listPaths()];
  const sortedPaths = [...paths].sort(compareStrings);
  if (JSON.stringify(paths) !== JSON.stringify(sortedPaths)) {
    fail("embedded release inventory is not sorted");
  }
  if (!paths.includes(VERSION_PATH)) fail("embedded release inventory has no VERSION");

  const version = await payload.readVersion();
  assertVersionComponent(version);
  const assets: ReleaseAsset[] = [];
  for (const path of paths) {
    assertAssetPath(path);
    assets.push({ path, bytes: new Uint8Array(await payload.read(path)) });
  }
  const versionAsset = assets.find((asset) => asset.path === VERSION_PATH);
  if (versionAsset === undefined || versionFromBytes(versionAsset.bytes) !== version) {
    fail("embedded release VERSION disagrees with its inventory");
  }
  const canonicalTree = buildExpectedTree(assets);
  const expectedTree = newExpectedDirectory();
  expectedTree.children.set(CANONICAL_DIRECTORY_NAME, canonicalTree);
  return { version, assets, expectedTree };
}

export function defaultDataRoot(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const configured = environment.XDG_DATA_HOME;
  if (configured !== undefined && configured.length > 0) {
    assertAbsoluteDataRoot(configured);
    return configured;
  }

  const home = environment.HOME;
  if (home === undefined || home.length === 0) fail("HOME must be set when XDG_DATA_HOME is unset");
  assertAbsoluteDataRoot(home);
  const dataRoot = join(home, ".local", "share");
  assertAbsoluteDataRoot(dataRoot);
  return dataRoot;
}

export function managedReleaseLayout(dataRoot = defaultDataRoot()): ManagedReleaseLayout {
  assertAbsoluteDataRoot(dataRoot);
  const root = join(dataRoot, MANAGED_DIRECTORY_NAME);
  return {
    dataRoot,
    root,
    versions: join(root, VERSIONS_DIRECTORY_NAME),
    current: join(root, CURRENT_NAME),
  };
}

export async function materializeEmbeddedRelease(
  payload: EmbeddedPayload,
  options: MaterializeEmbeddedReleaseOptions = {},
): Promise<MaterializedEmbeddedRelease> {
  const fileSystem = options.fileSystem ?? nativeManagedReleaseFileSystem;
  const embedded = await readEmbeddedRelease(payload);
  const layout = managedReleaseLayout(options.dataRoot);

  ensureRealDirectory(layout.dataRoot, "data root", fileSystem);
  assertManagedRootInventory(layout, fileSystem);
  const existingCurrentVersion = inspectCurrent(layout, fileSystem);
  const versionPath = join(layout.versions, embedded.version);
  const canonicalPath = join(versionPath, CANONICAL_DIRECTORY_NAME);
  const expectedTree = embedded.expectedTree;

  let published = false;
  let reused = false;
  if (pathExists(versionPath, fileSystem)) {
    verifyExactVersion(versionPath, embedded.version, expectedTree, fileSystem);
    reused = true;
  } else {
    const temporary = temporaryPath(layout.versions, ".materialize-", fileSystem);
    try {
      fileSystem.mkdir(temporary);
      assertRealDirectory(temporary, "temporary release directory", fileSystem);
      const temporaryCanonical = join(temporary, CANONICAL_DIRECTORY_NAME);
      fileSystem.mkdir(temporaryCanonical);
      assertRealDirectory(temporaryCanonical, "temporary canonical directory", fileSystem);

      for (const asset of embedded.assets) {
        const destination = join(temporaryCanonical, ...asset.path.split("/"));
        ensureRealDirectory(dirname(destination), "temporary release parent", fileSystem);
        if (pathExists(destination, fileSystem)) {
          fail(`temporary release has a conflicting entry: ${asset.path}`);
        }
        fileSystem.writeFile(destination, asset.bytes);
      }
      verifyExactVersion(temporary, embedded.version, expectedTree, fileSystem);

      if (pathExists(versionPath, fileSystem)) {
        verifyExactVersion(versionPath, embedded.version, expectedTree, fileSystem);
        reused = true;
      } else {
        fileSystem.rename(temporary, versionPath);
        published = true;
      }
    } finally {
      if (pathExists(temporary, fileSystem)) removeOwnedTree(temporary, fileSystem);
    }
    if (published) verifyExactVersion(versionPath, embedded.version, expectedTree, fileSystem);
  }

  let activeVersion = existingCurrentVersion;
  let activated = false;
  if (options.activate === true) {
    if (existingCurrentVersion !== embedded.version) {
      switchCurrent(layout, embedded.version, fileSystem);
      activated = true;
    }
    activeVersion = embedded.version;
  }

  return {
    layout,
    version: embedded.version,
    versionPath,
    canonicalPath,
    published,
    reused,
    activated,
    ...(activeVersion === undefined ? {} : { activeVersion }),
  };
}
