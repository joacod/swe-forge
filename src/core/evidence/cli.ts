import {
  HelpRequested,
  runDeliverPr,
  runPreflight,
  runRecordCheckStatus,
  runReview,
  runValidate,
  usage,
  type GateResult,
} from "./gate";

export async function runEvidenceCli(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(usage);
    return 2;
  }
  const command = args[0];
  if (command === "-h" || command === "--help") {
    process.stdout.write(usage);
    return 0;
  }
  const commandArgs = args.slice(1);
  try {
    let result: GateResult;
    switch (command) {
      case "preflight":
        result = await runPreflight(commandArgs);
        break;
      case "validate":
        result = await runValidate(commandArgs);
        break;
      case "record-check-status":
        result = await runRecordCheckStatus(commandArgs);
        break;
      case "review":
        result = await runReview(commandArgs);
        break;
      case "deliver-pr":
        result = await runDeliverPr(commandArgs);
        break;
      default:
        process.stderr.write(`FAIL: unknown command: ${command}\n`);
        return 1;
    }
    if (result.stdout !== "") process.stdout.write(result.stdout);
    if (result.stderr !== "") process.stderr.write(result.stderr);
    return result.exitCode;
  } catch (error) {
    if (error instanceof HelpRequested) {
      process.stdout.write(usage);
      return 0;
    }
    process.stderr.write(`FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = await runEvidenceCli();
