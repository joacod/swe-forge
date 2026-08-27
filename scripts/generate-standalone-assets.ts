import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  loadAdapterRows,
  registeredHarnesses,
  validateAdapterRegistry,
  type AdapterRow,
} from "../src/install/registry";

export interface ReleaseAsset {
  readonly path: string;
  readonly sourcePath: string;
  readonly mode?: number;
}

// This mirrors the installer's canonical support inventory. Git-tracked files
// are the repository-owned source of truth so ignored and untracked local files
// cannot enter a release payload.
const TOP_LEVEL_ASSETS = ["AGENTS.md", "SWE-FORGE.md", "VERSION"] as const;
const ADAPTER_REGISTRY = ".swe-forge/adapters/registry.tsv";
const CANONICAL_SUPPORT_ROOT = ".swe-forge";
const EXCLUDED_SUPPORT_DIRECTORIES = new Set(["adapters", "runs", ".runs", "generated"]);

function repositoryRoot(): string {
  return resolve(import.meta.dir, "..");
}

function fail(message: string): never {
  throw new Error(`standalone payload: ${message}`);
}

function normalizeRepositoryPath(path: string): string {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("\t") ||
    path.includes("\n") ||
    path.includes("\r") ||
    path === "." ||
    path.startsWith("./") ||
    path === ".." ||
    path.startsWith("../") ||
    path.includes("/../") ||
    path.includes("/./")
  ) {
    fail(`unsafe repository path: ${path}`);
  }
  return path;
}

function trackedRepositoryFiles(root: string): ReadonlySet<string> {
  const result = Bun.spawnSync(["git", "-C", root, "ls-files", "-z"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    const error = new TextDecoder().decode(result.stderr).trim();
    fail(`could not enumerate tracked files${error.length === 0 ? "" : `: ${error}`}`);
  }

  const files = new Set<string>();
  const output = new TextDecoder().decode(result.stdout);
  for (const value of output.split("\0")) {
    if (value.length === 0) continue;
    files.add(normalizeRepositoryPath(value));
  }
  return files;
}

function absolutePath(root: string, repositoryPath: string): string {
  return join(root, ...repositoryPath.split("/"));
}

function assertTrackedFile(
  root: string,
  tracked: ReadonlySet<string>,
  repositoryPath: string,
): string {
  const normalized = normalizeRepositoryPath(repositoryPath);
  if (!tracked.has(normalized)) fail(`release asset is not tracked: ${normalized}`);
  const sourcePath = absolutePath(root, normalized);
  let stats;
  try {
    stats = lstatSync(sourcePath);
  } catch {
    fail(`tracked release asset is missing: ${normalized}`);
  }
  if (!stats.isFile()) fail(`release asset is not a regular file: ${normalized}`);
  return sourcePath;
}

function addAsset(
  root: string,
  tracked: ReadonlySet<string>,
  assets: Map<string, ReleaseAsset>,
  repositoryPath: string,
): void {
  const normalized = normalizeRepositoryPath(repositoryPath);
  const sourcePath = assertTrackedFile(root, tracked, normalized);
  const mode = lstatSync(sourcePath).mode & 0o777;
  const existing = assets.get(normalized);
  if (existing !== undefined && existing.sourcePath !== sourcePath) {
    fail(`release asset has conflicting sources: ${normalized}`);
  }
  for (const asset of assets.values()) {
    if (asset.path !== normalized && asset.sourcePath === sourcePath) {
      fail(`release asset source is listed more than once: ${sourcePath}`);
    }
  }
  assets.set(normalized, { path: normalized, sourcePath, mode });
}

function trackedFilesUnder(
  tracked: ReadonlySet<string>,
  directory: string,
): readonly string[] {
  const prefix = `${directory}/`;
  return [...tracked]
    .filter((path) => path.startsWith(prefix))
    .sort(comparePaths);
}

function comparePaths(first: string, second: string): number {
  if (first < second) return -1;
  if (first > second) return 1;
  return 0;
}

function addCanonicalSupportFiles(
  root: string,
  tracked: ReadonlySet<string>,
  assets: Map<string, ReleaseAsset>,
): void {
  const names = new Set<string>();
  const prefix = `${CANONICAL_SUPPORT_ROOT}/`;
  for (const path of tracked) {
    if (!path.startsWith(prefix)) continue;
    const remainder = path.slice(prefix.length);
    const separator = remainder.indexOf("/");
    if (separator < 1) continue;
    const name = remainder.slice(0, separator);
    if (name.startsWith(".") || EXCLUDED_SUPPORT_DIRECTORIES.has(name)) continue;
    const directory = absolutePath(root, `${CANONICAL_SUPPORT_ROOT}/${name}`);
    let stats;
    try {
      stats = lstatSync(directory);
    } catch {
      fail(`canonical support directory is missing: ${CANONICAL_SUPPORT_ROOT}/${name}`);
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      fail(`canonical support directory is not a real directory: ${CANONICAL_SUPPORT_ROOT}/${name}`);
    }
    names.add(name);
  }

  for (const name of [...names].sort(comparePaths)) {
    const directory = `${CANONICAL_SUPPORT_ROOT}/${name}`;
    for (const path of trackedFilesUnder(tracked, directory)) addAsset(root, tracked, assets, path);
  }
}

function addAdapterRowFiles(
  root: string,
  tracked: ReadonlySet<string>,
  assets: Map<string, ReleaseAsset>,
  row: AdapterRow,
): void {
  const repositoryPath = `.swe-forge/adapters/${row.source}`;
  if (row.kind === "file") {
    addAsset(root, tracked, assets, repositoryPath);
    return;
  }

  const sourcePath = absolutePath(root, repositoryPath);
  let stats;
  try {
    stats = lstatSync(sourcePath);
  } catch {
    fail(`registered adapter tree is missing: ${repositoryPath}`);
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`registered adapter tree is not a real directory: ${repositoryPath}`);
  }

  const files = trackedFilesUnder(tracked, repositoryPath);
  if (files.length === 0) fail(`registered adapter tree has no tracked files: ${repositoryPath}`);
  for (const path of files) addAsset(root, tracked, assets, path);
}

function addRegisteredAdapterFiles(
  root: string,
  tracked: ReadonlySet<string>,
  assets: Map<string, ReleaseAsset>,
): void {
  const registryPath = absolutePath(root, ADAPTER_REGISTRY);
  validateAdapterRegistry(root, registryPath);
  addAsset(root, tracked, assets, ADAPTER_REGISTRY);

  const harnesses = [...registeredHarnesses(registryPath)].sort(comparePaths);
  for (const harness of harnesses) {
    const rows = loadAdapterRows(root, harness, registryPath);
    for (const row of rows) addAdapterRowFiles(root, tracked, assets, row);
  }
}

function validateVersion(root: string): void {
  const contents = readFileSync(absolutePath(root, "VERSION"), "utf8");
  const version = contents.split("\n")[0] ?? "";
  if (version.length === 0 || version.endsWith("\r")) fail("VERSION must have a non-empty first line");
}

export function enumerateReleasePayload(root = repositoryRoot()): readonly ReleaseAsset[] {
  const resolvedRoot = resolve(root);
  const tracked = trackedRepositoryFiles(resolvedRoot);
  const assets = new Map<string, ReleaseAsset>();

  for (const path of TOP_LEVEL_ASSETS) addAsset(resolvedRoot, tracked, assets, path);
  addCanonicalSupportFiles(resolvedRoot, tracked, assets);
  addRegisteredAdapterFiles(resolvedRoot, tracked, assets);
  validateVersion(resolvedRoot);

  return [...assets.values()].sort((first, second) => comparePaths(first.path, second.path));
}

function importSpecifier(fromFile: string, sourcePath: string): string {
  const value = relative(dirname(fromFile), sourcePath).split("\\").join("/");
  return value.startsWith(".") ? value : `./${value}`;
}

export function renderEmbeddedAssetsModule(
  assets: readonly ReleaseAsset[],
  generatedModulePath: string,
): string {
  const outputPath = resolve(generatedModulePath);
  const lines = [
    "// Generated by scripts/generate-standalone-assets.ts; do not edit.",
  ];
  for (const [index, asset] of assets.entries()) {
    lines.push(
      `import asset${index} from ${JSON.stringify(importSpecifier(outputPath, asset.sourcePath))} with { type: "file" };`,
    );
  }
  lines.push("", "export const embeddedAssets = [");
  for (const [index, asset] of assets.entries()) {
    lines.push(
      `  { path: ${JSON.stringify(asset.path)}, embeddedPath: asset${index}, mode: ${asset.mode ?? 0o644} },`,
    );
  }
  lines.push("] as const;", "");
  return `${lines.join("\n")}`;
}

export function writeEmbeddedAssetsModule(
  root: string,
  generatedModulePath: string,
): readonly ReleaseAsset[] {
  const assets = enumerateReleasePayload(root);
  mkdirSync(dirname(generatedModulePath), { recursive: true });
  writeFileSync(generatedModulePath, renderEmbeddedAssetsModule(assets, generatedModulePath));
  return assets;
}

if (import.meta.main) {
  try {
    const output = process.argv[2] ?? join(repositoryRoot(), "build", "standalone", "embedded-assets.ts");
    const assets = writeEmbeddedAssetsModule(repositoryRoot(), output);
    process.stdout.write(`Generated ${assets.length} standalone release assets: ${output}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
