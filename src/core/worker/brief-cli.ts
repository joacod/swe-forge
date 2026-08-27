import { loadJson } from "./json";
import { validateBrief } from "./brief";
import { fail } from "./helpers";

const USAGE = [
  "Usage:",
  "  swe-forge-worker-brief validate --brief FILE|-",
  "  swe-forge-worker-brief inspect --brief FILE|-",
  "",
  "The brief is one canonical worker_briefing/v1 JSON object. Validate it before",
  "launch and pass the same JSON text to the worker. inspect validates the brief",
  "and emits the small task/profile/write-access port used by host adapters.",
  "",
].join("\n") + "\n";
class HelpRequested extends Error {}

function briefPath(arguments_: readonly string[]): string {
  if (arguments_.length === 1 && (arguments_[0] === "-h" || arguments_[0] === "--help")) {
    throw new HelpRequested();
  }
  if (arguments_.length !== 2 || arguments_[0] !== "--brief") fail("use --brief FILE|-");
  return arguments_[1];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function runWorkerBriefCli(args: readonly string[] = process.argv.slice(2)): number {
  if (args.length === 0) {
    process.stdout.write(USAGE);
    return 2;
  }
  if (args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(USAGE);
    return 0;
  }

  try {
    const command = args[0];
    if (command !== "validate" && command !== "inspect") fail(`unknown operation: ${command}`);
    const document = loadJson(briefPath(args.slice(1)), "brief");
    const inspection = validateBrief(document);
    if (command === "validate") {
      process.stdout.write("PASS: worker briefing validated\n");
      return 0;
    }
    process.stdout.write(
      `${JSON.stringify({
        schema: "worker-brief/v1",
        valid: true,
        task_id: inspection.taskId,
        profile: inspection.profile,
        write_access: inspection.writeAccess,
      })}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof HelpRequested) {
      process.stdout.write(USAGE);
      return 0;
    }
    process.stderr.write(`FAIL: ${errorText(error)}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = runWorkerBriefCli();
