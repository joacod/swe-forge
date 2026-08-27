export interface EmbeddedAsset {
  readonly path: string;
  readonly embeddedPath: string;
}

const VERSION_PATH = "VERSION";

function assertLogicalPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.split("/").some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`embedded asset path is unsafe: ${path}`);
  }
}

function versionFromText(contents: string): string {
  const version = contents.split("\n")[0] ?? "";
  if (version.length === 0 || version.endsWith("\r")) {
    throw new Error("embedded VERSION must have a non-empty first line");
  }
  return version;
}

export class EmbeddedPayload {
  private readonly assets: readonly EmbeddedAsset[];
  private readonly assetsByPath: ReadonlyMap<string, EmbeddedAsset>;

  public constructor(assets: readonly EmbeddedAsset[]) {
    const copied = assets.map((asset) => {
      assertLogicalPath(asset.path);
      if (asset.embeddedPath.length === 0) throw new Error(`embedded asset has no source: ${asset.path}`);
      return Object.freeze({ path: asset.path, embeddedPath: asset.embeddedPath });
    });
    const byPath = new Map<string, EmbeddedAsset>();
    const embeddedPaths = new Set<string>();
    let previousPath = "";
    for (const asset of copied) {
      if (previousPath.length > 0 && asset.path <= previousPath) {
        throw new Error("embedded asset paths are not sorted");
      }
      if (byPath.has(asset.path)) throw new Error(`embedded asset is duplicated: ${asset.path}`);
      if (embeddedPaths.has(asset.embeddedPath)) {
        throw new Error(`embedded asset source is duplicated: ${asset.embeddedPath}`);
      }
      byPath.set(asset.path, asset);
      embeddedPaths.add(asset.embeddedPath);
      previousPath = asset.path;
    }
    this.assets = Object.freeze(copied);
    this.assetsByPath = byPath;
  }

  public hasPayload(): boolean {
    return this.assets.length > 0;
  }

  public listPaths(): readonly string[] {
    return this.assets.map((asset) => asset.path);
  }

  public async read(path: string): Promise<Uint8Array> {
    const asset = this.assetsByPath.get(path);
    if (asset === undefined) throw new Error(`embedded asset is not present: ${path}`);
    return new Uint8Array(await Bun.file(asset.embeddedPath).arrayBuffer());
  }

  public async readText(path: string): Promise<string> {
    return new TextDecoder().decode(await this.read(path));
  }

  public async readVersion(): Promise<string> {
    return versionFromText(await this.readText(VERSION_PATH));
  }

  public async validate(): Promise<void> {
    if (!this.hasPayload()) throw new Error("embedded release payload is not available");
    if (!this.assetsByPath.has(VERSION_PATH)) throw new Error("embedded release payload has no VERSION");
    await this.readVersion();
  }
}

export function createEmbeddedPayload(assets: readonly EmbeddedAsset[]): EmbeddedPayload {
  return new EmbeddedPayload(assets);
}
