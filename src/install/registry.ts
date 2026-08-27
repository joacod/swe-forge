import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type AdapterKind = "file" | "tree";

export interface AdapterRow {
  readonly lineNumber: number;
  readonly harness: string;
  readonly kind: AdapterKind;
  readonly source: string;
  readonly destination: string;
  readonly support: string;
}

export function registryPathIsSafe(value: string): boolean {
  if (value.length === 0) return false;
  if (value === "-") return true;
  if (value.startsWith("/") || value.endsWith("/")) return false;
  if (value.includes("|")) return false;

  const wrapped = `/${value}/`;
  if (wrapped.includes("/./") || wrapped.includes("/../")) return false;
  return true;
}

export function registryRowIsValid(
  harness: string,
  kind: string,
  source: string,
  destination: string,
  support: string,
): boolean {
  if (harness.length === 0) return false;
  if (kind !== "file" && kind !== "tree") return false;
  if (source === "-") return false;
  if (destination === "-") return false;
  if (!registryPathIsSafe(source)) return false;
  if (!registryPathIsSafe(destination)) return false;
  if (support !== "-" && !registryPathIsSafe(support)) return false;
  return true;
}

function splitRegistryLine(line: string): readonly [string, string, string, string, string] {
  const fields = line.split("|");
  return [
    fields[0] ?? "",
    fields[1] ?? "",
    fields[2] ?? "",
    fields[3] ?? "",
    fields.length > 4 ? fields.slice(4).join("|") : "",
  ];
}

function registryLines(path: string): readonly string[] {
  const contents = readFileSync(path, "utf8");
  const lines = contents.split("\n");
  return lines.slice(0, -1);
}

function sourceExistsAsExpected(path: string, kind: AdapterKind): boolean {
  try {
    const stats = statSync(path);
    return kind === "file" ? stats.isFile() : stats.isDirectory();
  } catch {
    return false;
  }
}

export function registeredHarnesses(registryPath: string): ReadonlySet<string> {
  const harnesses = new Set<string>();
  for (const line of registryLines(registryPath)) {
    const harness = splitRegistryLine(line)[0];
    if (harness === "" || harness.startsWith("#")) continue;
    harnesses.add(harness);
  }
  return harnesses;
}

export function loadAdapterRows(
  sourceRoot: string,
  harness: string,
  registryPath = join(sourceRoot, ".swe-forge", "adapters", "registry.tsv"),
): readonly AdapterRow[] {
  const selected: AdapterRow[] = [];
  let lineNumber = 0;

  for (const line of registryLines(registryPath)) {
    lineNumber += 1;
    const [rowHarness, kind, source, destination, support] = splitRegistryLine(line);
    if (rowHarness === "" || rowHarness.startsWith("#")) continue;

    if (!registryRowIsValid(rowHarness, kind, source, destination, support)) {
      throw new Error(`invalid adapter registry row at line ${lineNumber}`);
    }
    const adapterKind: AdapterKind = kind === "file" ? "file" : "tree";

    const sourcePath = join(sourceRoot, ".swe-forge", "adapters", source);
    if (!sourceExistsAsExpected(sourcePath, adapterKind)) {
      throw new Error(
        `adapter registry ${kind} source is missing at line ${lineNumber}: ${source}`,
      );
    }

    if (rowHarness === harness) {
      selected.push({
        lineNumber,
        harness: rowHarness,
        kind: adapterKind,
        source,
        destination,
        support,
      });
    }
  }

  if (selected.length === 0) {
    throw new Error(`no adapter targets registered for harness: ${harness}`);
  }
  return selected;
}

export function adapterRegistryContains(
  sourceRoot: string,
  harness: string,
  registryPath = join(sourceRoot, ".swe-forge", "adapters", "registry.tsv"),
): boolean {
  try {
    return registeredHarnesses(registryPath).has(harness);
  } catch {
    return false;
  }
}
