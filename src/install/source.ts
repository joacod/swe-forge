import { realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export type InstallSourceMode = "checkout" | "release";

export interface InstallSource {
  readonly mode: InstallSourceMode;
  readonly logicalRoot: string;
  readonly realRoot: string;
}

export function checkoutInstallSource(sourceRoot?: string): InstallSource {
  const realRoot = realpathSync(sourceRoot ?? resolve(import.meta.dir, "../.."));
  return { mode: "checkout", logicalRoot: realRoot, realRoot };
}

export function releaseInstallSource(logicalRoot: string, realRoot: string): InstallSource {
  if (!isAbsolute(logicalRoot)) {
    throw new Error("install source logical root must be an absolute path");
  }
  return {
    mode: "release",
    logicalRoot,
    realRoot: realpathSync(realRoot),
  };
}

export function normalizeInstallSource(source: InstallSource): InstallSource {
  const realRoot = realpathSync(source.realRoot);
  switch (source.mode) {
    case "checkout":
      return { mode: "checkout", logicalRoot: realRoot, realRoot };
    case "release":
      if (!isAbsolute(source.logicalRoot)) {
        throw new Error("install source logical root must be an absolute path");
      }
      return { mode: "release", logicalRoot: source.logicalRoot, realRoot };
    default:
      throw new Error("unsupported install source mode");
  }
}
