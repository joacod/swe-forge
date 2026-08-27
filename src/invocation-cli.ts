import { parseInvocation, type NormalizedInvocation } from "./invocation";

function jsonString(value: string): string {
  let result = '"';
  for (let index = 0; index < value.length; index += 1) {
    switch (value.charCodeAt(index)) {
      case 0x22:
        result += '\\"';
        break;
      case 0x5c:
        result += "\\\\";
        break;
      case 0x09:
        result += "\\t";
        break;
      case 0x0a:
        result += "\\n";
        break;
      case 0x0d:
        result += "\\r";
        break;
      case 0x0c:
        result += "\\f";
        break;
      case 0x08:
        result += "\\b";
        break;
      case 0x0b:
        result += "\\u000b";
        break;
      default:
        result += value[index];
    }
  }
  return `${result}"`;
}

export function serializeInvocation(invocation: NormalizedInvocation): string {
  return [
    '{"raw_arguments":',
    jsonString(invocation.raw_arguments),
    ',"parsed_ticket":',
    jsonString(invocation.parsed_ticket),
    ',"delivery_mode":"',
    invocation.delivery_mode,
    '","input_status":"',
    invocation.input_status,
    '"}',
  ].join("");
}

const usage = `Usage:
  swe-forge-invocation parse --raw-arguments TEXT
  swe-forge-invocation parse --stdin

\`--raw-arguments\` accepts the complete, unmodified argument string as one
value. \`--stdin\` reads that same value without changing whitespace. The parser
writes one deterministic JSON object with the normalized invocation facts
(\`input_status\` is \`COMPLETE\`, \`EMPTY\`, or \`INCOMPLETE\`). Delivery defaults to
\`PR\`; a leading \`guided\` selects \`GUIDED\`. Topology words are ticket text. The
parser never chooses topology.
`;

function fail(message: string): number {
  process.stderr.write(`FAIL: ${message}\n`);
  return 1;
}

export async function runInvocationCli(
  args: readonly string[] = process.argv.slice(2),
  readStdin: () => Promise<string> = () => Bun.stdin.text(),
): Promise<number> {
  if (args.length === 0) {
    process.stderr.write(usage);
    return 2;
  }

  const command = args[0];
  if (command === "-h" || command === "--help") {
    process.stdout.write(usage);
    return 0;
  }
  if (command !== "parse") return fail(`unknown command: ${command}`);

  const parseArgs = args.slice(1);
  if (parseArgs.length === 0) return fail("parse requires --raw-arguments or --stdin");

  const option = parseArgs[0];
  let rawArguments: string;
  switch (option) {
    case "--raw-arguments":
    case "--raw":
      if (parseArgs.length !== 2) return fail(`${option} requires exactly one value`);
      rawArguments = parseArgs[1]!;
      break;
    case "--stdin":
      if (parseArgs.length !== 1) return fail("--stdin does not accept additional arguments");
      rawArguments = await readStdin();
      break;
    case "-h":
    case "--help":
      process.stdout.write(usage);
      return 0;
    default:
      return fail(`unknown parse option: ${option}`);
  }

  process.stdout.write(`${serializeInvocation(parseInvocation(rawArguments))}\n`);
  return 0;
}

if (import.meta.main) process.exitCode = await runInvocationCli();
