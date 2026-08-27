import type { EmbeddedPayload } from "./embedded-payload";
import { runEvidenceCli } from "../core/evidence/cli";
import { runWorkerBriefCli } from "../core/worker/brief-cli";
import { runWorkerResultCli } from "../core/worker/result-cli";
import { runInvocationCli } from "../invocation-cli";
import { runStateCli } from "../state-cli";

const USAGE = `Usage:
  swe-forge version
  swe-forge payload [inspect]
  swe-forge payload read PATH
  swe-forge internal invocation [ARGS...]
  swe-forge internal state [ARGS...]
  swe-forge internal gate [ARGS...]
  swe-forge internal worker-brief [ARGS...]
  swe-forge internal worker-result [ARGS...]

The standalone executable reports its version from the embedded release payload.
The payload commands are read-only inspection; internal commands expose the
canonical typed tool ports used by release-mode compatibility wrappers.
`;

type InternalRunner = (args: readonly string[]) => number | Promise<number>;

const INTERNAL_RUNNERS: Readonly<Record<string, InternalRunner>> = {
  invocation: runInvocationCli,
  state: runStateCli,
  gate: runEvidenceCli,
  "worker-brief": runWorkerBriefCli,
  "worker-result": runWorkerResultCli,
};

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

async function runInternal(args: readonly string[]): Promise<number> {
  const name = args[0];
  if (name === undefined) return fail("internal requires a command");
  if (!Object.hasOwn(INTERNAL_RUNNERS, name)) return fail(`unknown internal command: ${name}`);
  return await INTERNAL_RUNNERS[name](args.slice(1));
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
      case "internal":
        return await runInternal(args.slice(1));
      default:
        return fail(`unknown command: ${args[0]}`);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
