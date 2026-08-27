import { expect, test } from "bun:test";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { createEmbeddedPayload, type EmbeddedAsset } from "../src/distribution/embedded-payload";
import {
  defaultDataRoot,
  managedReleaseLayout,
  materializeEmbeddedRelease,
  nativeManagedReleaseFileSystem,
  type ManagedReleaseFileSystem,
} from "../src/distribution/managed-payload";

type PayloadEntry = readonly [path: string, contents: string];
function makeRoot(prefix: string): string {
  return mkdtempSync(join(realpathSync(tmpdir()), prefix));
}

function makePayload(fixtureRoot: string, version: string, extraEntries: readonly PayloadEntry[] = []) {
  const sourceRoot = join(fixtureRoot, `embedded-${version.replaceAll(/[^A-Za-z0-9]+/gu, "-")}`);
  const entries: PayloadEntry[] = [
    [".swe-forge/tools/example", `#!/bin/sh\nprintf '%s\\n' '${version}'\n`],
    ["AGENTS.md", `agents for ${version}\n`],
    ["SWE-FORGE.md", `specification for ${version}\n`],
    ["VERSION", `${version}\n`],
    ...extraEntries,
  ];
  const assets: EmbeddedAsset[] = [];
  for (const [path, contents] of entries.sort(([first], [second]) => first.localeCompare(second))) {
    const embeddedPath = join(sourceRoot, ...path.split("/"));
    mkdirSync(dirname(embeddedPath), { recursive: true });
    writeFileSync(embeddedPath, contents);
    assets.push({ path, embeddedPath });
  }
  return createEmbeddedPayload(assets);
}

function managedVersionPath(dataRoot: string, version: string): string {
  return join(managedReleaseLayout(dataRoot).versions, version);
}

function pathExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

async function expectFailure(operation: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await operation();
    throw new Error("operation unexpectedly succeeded");
  } catch (error) {
    expect(error instanceof Error ? error.message : String(error)).toContain(message);
  }
}

test("materializes the exact first release and reuses a valid immutable version", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-first-");
  try {
    const dataRoot = join(fixtureRoot, "data");
    mkdirSync(dataRoot);
    const payload = makePayload(fixtureRoot, "1.2.3-alpha.1");
    const layout = managedReleaseLayout(dataRoot);

    const first = await materializeEmbeddedRelease(payload, { dataRoot });
    expect(first.published).toBe(true);
    expect(first.reused).toBe(false);
    expect(first.activated).toBe(false);
    expect(first.activeVersion).toBeUndefined();
    expect(first.versionPath).toBe(join(layout.versions, "1.2.3-alpha.1"));
    expect(first.canonicalPath).toBe(join(first.versionPath, "canonical"));
    expect(readFileSync(join(first.canonicalPath, "VERSION"), "utf8")).toBe("1.2.3-alpha.1\n");
    expect(readFileSync(join(first.canonicalPath, "SWE-FORGE.md"), "utf8")).toBe(
      "specification for 1.2.3-alpha.1\n",
    );
    expect(readdirSync(layout.root).sort()).toEqual(["versions"]);
    expect(readdirSync(layout.versions)).toEqual(["1.2.3-alpha.1"]);
    expect(pathExists(layout.current)).toBe(false);

    const second = await materializeEmbeddedRelease(payload, { dataRoot });
    expect(second.published).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.versionPath).toBe(first.versionPath);
    expect(readFileSync(join(second.canonicalPath, "VERSION"), "utf8")).toBe("1.2.3-alpha.1\n");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("refuses modified, missing, extra, and incorrect existing version entries", async () => {
  const cases: readonly PayloadEntry[] = [
    ["modified", "changed\n"],
    ["missing", ""],
    ["extra", "extra\n"],
    ["incorrect", "wrong\n"],
  ];
  for (const [kind, contents] of cases) {
    const fixtureRoot = makeRoot(`swe-forge-managed-${kind}-`);
    try {
      const dataRoot = join(fixtureRoot, "data");
      mkdirSync(dataRoot);
      const payload = makePayload(fixtureRoot, "2.0.0");
      const result = await materializeEmbeddedRelease(payload, { dataRoot });
      const affectedPath = join(result.canonicalPath, kind === "extra" ? "unexpected" : "AGENTS.md");
      if (kind === "missing") rmSync(affectedPath);
      else writeFileSync(affectedPath, contents);

      await expectFailure(
        () => materializeEmbeddedRelease(payload, { dataRoot }),
        kind === "extra" ? "extra entry" : kind === "missing" ? "missing" : "incorrect content",
      );
      expect(pathExists(result.versionPath)).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }
});

test("publishes a complete version only through the atomic rename boundary", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-atomic-");
  try {
    const dataRoot = join(fixtureRoot, "data");
    mkdirSync(dataRoot);
    const payload = makePayload(fixtureRoot, "3.0.0");
    const versionPath = managedVersionPath(dataRoot, "3.0.0");
    let renameObserved = false;
    const fileSystem: ManagedReleaseFileSystem = {
      ...nativeManagedReleaseFileSystem,
      rename: (oldPath, newPath) => {
        expect(newPath).toBe(versionPath);
        expect(pathExists(newPath)).toBe(false);
        expect(readFileSync(join(oldPath, "canonical", "VERSION"), "utf8")).toBe("3.0.0\n");
        renameObserved = true;
        nativeManagedReleaseFileSystem.rename(oldPath, newPath);
      },
    };

    const result = await materializeEmbeddedRelease(payload, { dataRoot, fileSystem });
    expect(renameObserved).toBe(true);
    expect(result.published).toBe(true);
    expect(pathExists(versionPath)).toBe(true);
    expect(readdirSync(managedReleaseLayout(dataRoot).versions)).toEqual(["3.0.0"]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("failed publication leaves no partial version directory", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-atomic-failure-");
  try {
    const dataRoot = join(fixtureRoot, "data");
    mkdirSync(dataRoot);
    const payload = makePayload(fixtureRoot, "3.1.0");
    const versionPath = managedVersionPath(dataRoot, "3.1.0");
    const fileSystem: ManagedReleaseFileSystem = {
      ...nativeManagedReleaseFileSystem,
      rename: () => {
        throw new Error("injected publication failure");
      },
    };

    await expectFailure(
      () => materializeEmbeddedRelease(payload, { dataRoot, fileSystem }),
      "injected publication failure",
    );
    expect(pathExists(versionPath)).toBe(false);
    expect(readdirSync(managedReleaseLayout(dataRoot).versions)).toEqual([]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("creates and switches the stable current pointer only when activated", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-current-");
  try {
    const dataRoot = join(fixtureRoot, "data");
    mkdirSync(dataRoot);
    const firstPayload = makePayload(fixtureRoot, "4.0.0");
    const secondPayload = makePayload(fixtureRoot, "4.1.0");
    const layout = managedReleaseLayout(dataRoot);

    const first = await materializeEmbeddedRelease(firstPayload, { dataRoot, activate: true });
    expect(first.activated).toBe(true);
    expect(first.activeVersion).toBe("4.0.0");
    expect(readlinkSync(layout.current)).toBe("versions/4.0.0");
    expect(realpathSync(layout.current)).toBe(realpathSync(first.versionPath));

    const second = await materializeEmbeddedRelease(secondPayload, { dataRoot, activate: true });
    expect(second.published).toBe(true);
    expect(second.activated).toBe(true);
    expect(readlinkSync(layout.current)).toBe("versions/4.1.0");
    expect(realpathSync(layout.current)).toBe(realpathSync(second.versionPath));

    const switchedBack = await materializeEmbeddedRelease(firstPayload, { dataRoot, activate: true });
    expect(switchedBack.reused).toBe(true);
    expect(switchedBack.activated).toBe(true);
    expect(readlinkSync(layout.current)).toBe("versions/4.0.0");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("keeps a valid published version when current switching fails", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-current-failure-");
  try {
    const dataRoot = join(fixtureRoot, "data");
    mkdirSync(dataRoot);
    const firstPayload = makePayload(fixtureRoot, "4.2.0");
    const secondPayload = makePayload(fixtureRoot, "4.3.0");
    const layout = managedReleaseLayout(dataRoot);
    await materializeEmbeddedRelease(firstPayload, { dataRoot, activate: true });

    const fileSystem: ManagedReleaseFileSystem = {
      ...nativeManagedReleaseFileSystem,
      rename: (oldPath, newPath) => {
        if (newPath === layout.current) throw new Error("injected current publication failure");
        nativeManagedReleaseFileSystem.rename(oldPath, newPath);
      },
    };
    await expectFailure(
      () => materializeEmbeddedRelease(secondPayload, { dataRoot, activate: true, fileSystem }),
      "injected current publication failure",
    );
    expect(readlinkSync(layout.current)).toBe("versions/4.2.0");
    expect(pathExists(join(layout.versions, "4.3.0"))).toBe(true);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("refuses unsafe data roots, versions, assets, and current targets", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-safety-");
  try {
    const outside = join(fixtureRoot, "outside");
    mkdirSync(outside);
    const linkedDataRoot = join(fixtureRoot, "linked-data");
    symlinkSync(outside, linkedDataRoot);
    const linkedPayload = makePayload(fixtureRoot, "5.0.0");
    await expectFailure(
      () => materializeEmbeddedRelease(linkedPayload, { dataRoot: join(linkedDataRoot, "nested") }),
      "symlinked directory",
    );
    expect(readdirSync(outside)).toEqual([]);

    const invalidVersionPayload = makePayload(fixtureRoot, "../escape");
    await expectFailure(
      () => materializeEmbeddedRelease(invalidVersionPayload, { dataRoot: join(fixtureRoot, "invalid-version") }),
      "safe path component",
    );
    expect(pathExists(join(fixtureRoot, "invalid-version"))).toBe(false);

    expect(() =>
      createEmbeddedPayload([{ path: "../escape", embeddedPath: join(fixtureRoot, "missing") }]),
    ).toThrow("unsafe");

    const dataRoot = join(fixtureRoot, "current-data");
    mkdirSync(dataRoot);
    const firstPayload = makePayload(fixtureRoot, "5.1.0");
    const secondPayload = makePayload(fixtureRoot, "5.2.0");
    await materializeEmbeddedRelease(firstPayload, { dataRoot, activate: true });
    const layout = managedReleaseLayout(dataRoot);
    rmSync(layout.current);
    symlinkSync(join(outside, "not-a-release"), layout.current);
    await expectFailure(
      () => materializeEmbeddedRelease(secondPayload, { dataRoot, activate: true }),
      "outside the managed versions directory",
    );
    expect(readlinkSync(layout.current)).toBe(join(outside, "not-a-release"));

    const symlinkVersionsRoot = join(fixtureRoot, "symlink-versions-data");
    mkdirSync(join(symlinkVersionsRoot, "swe-forge"), { recursive: true });
    symlinkSync(outside, join(symlinkVersionsRoot, "swe-forge", "versions"));
    await expectFailure(
      () => materializeEmbeddedRelease(firstPayload, { dataRoot: symlinkVersionsRoot }),
      "managed versions directory must be a real directory",
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("requires an embedded VERSION and agrees on the materialized version path", async () => {
  const fixtureRoot = makeRoot("swe-forge-managed-inventory-");
  try {
    const sourcePath = join(fixtureRoot, "embedded", "VERSION");
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, "6.0.0\nadditional metadata\n");
    const payload = createEmbeddedPayload([{ path: "AGENTS.md", embeddedPath: sourcePath }]);
    await expectFailure(
      () => materializeEmbeddedRelease(payload, { dataRoot: join(fixtureRoot, "data") }),
      "no VERSION",
    );

    const completePayload = makePayload(fixtureRoot, "6.0.0");
    const result = await materializeEmbeddedRelease(completePayload, {
      dataRoot: join(fixtureRoot, "data"),
    });
    expect(result.version).toBe("6.0.0");
    expect(result.versionPath.endsWith("/versions/6.0.0")).toBe(true);
    expect(readFileSync(join(result.canonicalPath, "VERSION"), "utf8")).toBe("6.0.0\n");
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
test("uses XDG data home and falls back to HOME-local data", () => {
  const fixtureRoot = makeRoot("swe-forge-managed-data-root-");
  try {
    const home = join(fixtureRoot, "home");
    const xdgDataHome = join(fixtureRoot, "xdg-data");
    mkdirSync(home);
    expect(defaultDataRoot({ HOME: home })).toBe(join(home, ".local", "share"));
    expect(defaultDataRoot({ HOME: home, XDG_DATA_HOME: xdgDataHome })).toBe(xdgDataHome);
    expect(() => defaultDataRoot({ HOME: home, XDG_DATA_HOME: "relative" })).toThrow(
      "absolute path",
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
