import type { EmbeddedPayload } from "./embedded-payload";

const USAGE = `Usage:
  swe-forge version
  swe-forge payload [inspect]
  swe-forge payload read PATH

The standalone executable reports its version from the embedded release payload.
The payload commands are read-only inspection; installation remains a
source-checkout operation.
`;

function fail(message: string): number {
  process.stderr.write(`FAIL: ${message}\n`);
  return 1;
}

async function reportVersion(payload: EmbeddedPayload): Promise<number> {
  await payload.validate();
  process.stdout.write(`SWE Forge version: ${await payload.readVersion()}\n`);
  process.stdout.write("source: embedded release payload\n");
  return 0;
}

async function inspectPayload(payload: EmbeddedPayload): Promise<number> {
  await payload.validate();
  const assets: Array<{ readonly path: string; readonly bytes: number }> = [];
  for (const path of payload.listPaths()) {
    assets.push({ path, bytes: (await payload.read(path)).byteLength });
  }
  process.stdout.write(
    `${JSON.stringify({
      embedded: payload.hasPayload(),
      version: await payload.readVersion(),
      asset_count: assets.length,
      assets,
    })}\n`,
  );
  return 0;
}

async function readPayloadAsset(payload: EmbeddedPayload, path: string): Promise<number> {
  await payload.validate();
  const contents = await payload.read(path);
  process.stdout.write(new TextDecoder().decode(contents));
  return 0;
}

export async function runStandaloneCli(
  args: readonly string[] = process.argv.slice(2),
  payload: EmbeddedPayload,
): Promise<number> {
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return args.length === 0 ? 2 : 0;
  }

  try {
    switch (args[0]) {
      case "version":
        if (args.length !== 1) return fail("version does not accept additional arguments");
        return await reportVersion(payload);
      case "payload":
        if (args.length === 1 || (args.length === 2 && args[1] === "inspect")) {
          return await inspectPayload(payload);
        }
        if (args[1] === "read" && args.length === 3) {
          return await readPayloadAsset(payload, args[2]!);
        }
        return fail("use payload [inspect] or payload read PATH");
      default:
        return fail(`unknown command: ${args[0]}`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
