import {
  assertRealAncestors,
  ensureDirectory,
  InstallSignal,
  isRegularFile,
  isSymlink,
  nativeInstallFileSystem,
  pathExists,
  type InstallFileSystem,
  type InstallTransaction,
} from "./filesystem";

export type ManifestKind = "file" | "dir";

export interface ManifestEntry {
  readonly kind: ManifestKind;
  readonly relative: string;
  readonly source: string;
  readonly linkTarget: string;
}

export interface ManifestInventoryEntry extends ManifestEntry {
  readonly destination: string;
}

export interface ManifestDocument {
  readonly metadata: Readonly<Record<string, string>>;
  readonly entries: readonly ManifestEntry[];
  readonly lookupEntries: readonly ManifestEntry[];
}

export interface ManifestPaths {
  readonly base: string;
  readonly directory: string;
  readonly path: string;
}

export function manifestPaths(
  home: string,
  harness: string,
  fs: InstallFileSystem = nativeInstallFileSystem,
): ManifestPaths {
  const directory = `${home}/.swe-forge-install-state`;
  const path = `${directory}/${harness}.tsv`;
  assertRealAncestors(`${directory}/manifest`, fs);
  if (pathExists(directory, fs) && !isRealManifestDirectory(directory, fs)) {
    throw new Error(`managed installation state must be a real directory: ${directory}`);
  }
  return { base: home, directory, path };
}

function isRealManifestDirectory(path: string, fs: InstallFileSystem): boolean {
  if (isSymlink(path, fs)) return false;
  try {
    return fs.stat(path).isDirectory();
  } catch {
    return false;
  }
}

function splitManifestLine(line: string): readonly [string, string, string, string, string] {
  const fields: string[] = [];
  let remainder = line;
  for (let index = 0; index < 4; index += 1) {
    const separator = remainder.indexOf("\t");
    if (separator < 0) {
      fields.push(remainder);
      remainder = "";
      while (fields.length < 4) fields.push("");
      return [fields[0] ?? "", fields[1] ?? "", fields[2] ?? "", fields[3] ?? "", ""];
    }
    fields.push(remainder.slice(0, separator));
    remainder = remainder.slice(separator + 1);
  }
  return [fields[0] ?? "", fields[1] ?? "", fields[2] ?? "", fields[3] ?? "", remainder];
}

function parseManifestText(contents: string): ManifestDocument {
  const lines = contents.split("\n");
  const completeLineCount = lines.length - 1;
  const metadata: Record<string, string> = Object.create(null) as Record<string, string>;
  const entries: ManifestEntry[] = [];
  const lookupEntries: ManifestEntry[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const equals = line.indexOf("=");
    if (equals >= 0) {
      const key = line.slice(0, equals);
      if (!(key in metadata)) metadata[key] = line.slice(equals + 1);
    }

    if (index >= completeLineCount) continue;
    const [marker, kind, relative, source, linkTarget] = splitManifestLine(line);
    if (marker !== "entry") continue;
    const entry = {
      kind: kind as ManifestKind,
      relative,
      source,
      linkTarget,
    };
    entries.push(entry);
    lookupEntries.push(entry);
  }

  if (completeLineCount < lines.length) {
    const finalLine = lines[completeLineCount] ?? "";
    const [marker, kind, relative, source, linkTarget] = splitManifestLine(finalLine);
    if (marker === "entry") {
      lookupEntries.push({
        kind: kind as ManifestKind,
        relative,
        source,
        linkTarget,
      });
    }
  }

  return { metadata, entries, lookupEntries };
}

function manifestRelativeIsUnsafe(relative: string): boolean {
  if (relative === "" || relative.startsWith("/") || relative === ".." || relative === ".") return true;
  if (relative.startsWith("../") || relative.startsWith("./")) return true;
  if (relative.endsWith("/..")) return true;
  if (relative.includes("/../")) return true;
  if (relative.includes("/./")) return true;
  return false;
}

export function validateManifest(
  paths: ManifestPaths,
  harness: string,
  fs: InstallFileSystem = nativeInstallFileSystem,
): ManifestDocument {
  if (!isRegularFile(paths.path, fs)) {
    throw new Error(`managed installation manifest is missing or not a regular file: ${paths.path}`);
  }

  const document = parseManifestText(fs.readFile(paths.path));
  if (document.metadata.manifest_version !== "2") {
    throw new Error(`unsupported managed installation manifest: ${paths.path}`);
  }
  if (document.metadata.harness !== harness) {
    throw new Error("managed installation manifest belongs to another harness");
  }
  if (document.metadata.base !== paths.base) {
    throw new Error("managed installation manifest base does not match user home");
  }

  let entriesFound = 0;
  for (const entry of document.entries) {
    entriesFound += 1;
    if (entry.kind !== "file" && entry.kind !== "dir") {
      throw new Error("managed manifest has an invalid entry kind");
    }
    if (manifestRelativeIsUnsafe(entry.relative)) {
      throw new Error(`managed manifest path is unsafe: ${entry.relative}`);
    }
    assertRealAncestors(`${paths.base}/${entry.relative}`, fs);
    if (entry.linkTarget.length === 0) {
      throw new Error("managed link entry has no target");
    }
  }
  if (entriesFound === 0) throw new Error("managed installation manifest has no entries");
  return document;
}

export function manifestRelativePath(base: string, destination: string): string {
  if (!destination.startsWith(`${base}/`)) {
    throw new Error(`managed path escapes user home: ${destination}`);
  }
  return destination.slice(base.length + 1);
}

export interface ManifestWriteInput {
  readonly paths: ManifestPaths;
  readonly sourceRoot: string;
  readonly sourceVersion: string;
  readonly sourceCommit: string;
  readonly harness: string;
  readonly entries: readonly ManifestInventoryEntry[];
  readonly fs?: InstallFileSystem;
  readonly transaction: InstallTransaction;
}

function rejectUnsupportedPath(path: string): void {
  if (path.includes("\t") || path.includes("\n")) {
    throw new Error(`paths containing tabs or newlines are not supported: ${path}`);
  }
}

function currentTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function writeManifest(input: ManifestWriteInput): void {
  const fs = input.fs ?? nativeInstallFileSystem;
  const { paths } = input;
  const exists = pathExists(paths.path, fs);
  if (exists) {
    input.transaction.protectManifestPath(paths.path);
    if (!isRegularFile(paths.path, fs)) {
      throw new Error(`managed installation manifest is not a regular file: ${paths.path}`);
    }
    const stats = fs.stat(paths.path);
    input.transaction.recordManifestExisting(paths.path, fs.readFile(paths.path), stats.mode);
  } else {
    input.transaction.recordManifestNew(paths.path);
  }

  ensureDirectory(paths.directory, paths.base, fs, input.transaction);
  const lines = [
    "manifest_version=2",
    `source_root=${input.sourceRoot}`,
    `source_version=${input.sourceVersion}`,
    `source_commit=${input.sourceCommit}`,
    `harness=${input.harness}`,
    `base=${paths.base}`,
    `updated_at=${currentTimestamp()}`,
  ];

  for (const entry of input.entries) {
    rejectUnsupportedPath(entry.destination);
    rejectUnsupportedPath(entry.source);
    if (!isSymlink(entry.destination, fs)) {
      throw new Error(`managed link disappeared before manifest write: ${entry.destination}`);
    }
    lines.push(
      ["entry", entry.kind, entry.relative, entry.source, fs.readlink(entry.destination)].join("\t"),
    );
  }

  const temporary = `${paths.path}.tmp.${process.pid}`;
  try {
    input.transaction.runCritical(() => {
      fs.writeFile(temporary, `${lines.join("\n")}\n`);
      input.transaction.recordCreatedFile(temporary);
    });
  } catch (error) {
    try {
      fs.unlink(temporary);
    } catch {
      // The shell implementation also ignores cleanup failures here.
    }
    if (error instanceof InstallSignal) throw error;
    throw new Error("could not write managed installation manifest");
  }
  try {
    input.transaction.runCritical(() => {
      fs.rename(temporary, paths.path);
      input.transaction.markManifestPublished();
    });
  } catch (error) {
    if (error instanceof InstallSignal) throw error;
    throw new Error(`could not publish managed installation manifest: ${paths.path}`);
  }
}

export function manifestEntryTarget(
  document: ManifestDocument,
  relative: string,
): string {
  for (const entry of document.lookupEntries) {
    if (entry.relative === relative) return entry.linkTarget.split("\t", 1)[0] ?? "";
  }
  return "";
}

export function manifestContainsRelative(
  entries: readonly ManifestInventoryEntry[],
  relative: string,
): boolean {
  return entries.some((entry) => entry.relative === relative);
}

export function manifestEntryDestination(paths: ManifestPaths, relative: string): string {
  return `${paths.base}/${relative}`;
}
export function manifestFileContainsRelative(
  path: string,
  relative: string,
  fs: InstallFileSystem = nativeInstallFileSystem,
): boolean {
  if (!isRegularFile(path, fs)) return false;
  return parseManifestText(fs.readFile(path)).lookupEntries.some((entry) => entry.relative === relative);
}
