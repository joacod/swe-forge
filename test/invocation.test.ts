import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { parseInvocation, type NormalizedInvocation } from "../src/invocation";
import { serializeInvocation } from "../src/invocation-cli";

const parserPath = resolve(import.meta.dir, "../.swe-forge/tools/swe-forge-invocation");

interface InvocationFixture {
  name: string;
  raw: string;
  expected: NormalizedInvocation;
}

const fixtures: readonly InvocationFixture[] = [
  {
    name: "empty input",
    raw: "",
    expected: {
      raw_arguments: "",
      parsed_ticket: "",
      delivery_mode: "PR",
      input_status: "EMPTY",
    },
  },
  {
    name: "default delivery",
    raw: "implement the parser",
    expected: {
      raw_arguments: "implement the parser",
      parsed_ticket: "implement the parser",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "leading pr modifier",
    raw: "pr implement the parser",
    expected: {
      raw_arguments: "pr implement the parser",
      parsed_ticket: "implement the parser",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "leading guided modifier",
    raw: "guided implement the parser",
    expected: {
      raw_arguments: "guided implement the parser",
      parsed_ticket: "implement the parser",
      delivery_mode: "GUIDED",
      input_status: "COMPLETE",
    },
  },
  {
    name: "topology words stay ticket text",
    raw: "subagents guided inspect the adapters",
    expected: {
      raw_arguments: "subagents guided inspect the adapters",
      parsed_ticket: "subagents guided inspect the adapters",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "modifier without ticket",
    raw: "pr",
    expected: {
      raw_arguments: "pr",
      parsed_ticket: "",
      delivery_mode: "PR",
      input_status: "INCOMPLETE",
    },
  },
  {
    name: "guided modifier with whitespace only ticket",
    raw: "guided\t \r\f\v",
    expected: {
      raw_arguments: "guided\t \r\f\v",
      parsed_ticket: "",
      delivery_mode: "GUIDED",
      input_status: "INCOMPLETE",
    },
  },
  {
    name: "supported whitespace trims only the boundary",
    raw: "\t\r\f\v  ticket  \t\r\f\v",
    expected: {
      raw_arguments: "\t\r\f\v  ticket  \t\r\f\v",
      parsed_ticket: "ticket",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "internal whitespace stays exact",
    raw: "guided\t  keep  \nline  \r\f\v",
    expected: {
      raw_arguments: "guided\t  keep  \nline  \r\f\v",
      parsed_ticket: "keep  \nline",
      delivery_mode: "GUIDED",
      input_status: "COMPLETE",
    },
  },
  {
    name: "uppercase modifier remains ticket text",
    raw: "GUIDED ticket",
    expected: {
      raw_arguments: "GUIDED ticket",
      parsed_ticket: "GUIDED ticket",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "unicode whitespace remains ticket text",
    raw: "ticket\u00a0",
    expected: {
      raw_arguments: "ticket\u00a0",
      parsed_ticket: "ticket\u00a0",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
  {
    name: "unicode separator does not split modifier",
    raw: "guided\u00a0ticket",
    expected: {
      raw_arguments: "guided\u00a0ticket",
      parsed_ticket: "guided\u00a0ticket",
      delivery_mode: "PR",
      input_status: "COMPLETE",
    },
  },
];

for (const fixture of fixtures) {
  test(`parses ${fixture.name}`, () => {
    expect(parseInvocation(fixture.raw)).toEqual(fixture.expected);
  });
}

test("preserves the oracle's JSON escaping and field order", () => {
  const invocation = parseInvocation('guided quote "slash\\ \t\v text');
  expect(serializeInvocation(invocation)).toBe(
    String.raw`{"raw_arguments":"guided quote \"slash\\ \t\u000b text","parsed_ticket":"quote \"slash\\ \t\u000b text","delivery_mode":"GUIDED","input_status":"COMPLETE"}`,
  );
});

test("accepts ticket text beyond the existing long-input fixture", () => {
  const raw = `pr ${"x".repeat(9_000)}`;
  const invocation = parseInvocation(raw);
  expect(invocation.input_status).toBe("COMPLETE");
  expect(invocation.parsed_ticket).toBe("x".repeat(9_000));
});

interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runParser(args: readonly string[], input?: string): ProcessResult {
  const result = Bun.spawnSync([parserPath, ...args], {
    stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

test("keeps the established stdin boundary exact", () => {
  const result = runParser(["parse", "--stdin"], '  pr  preserve\t"quoted"  \\ text\nsecond line  \n');
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe(
    String.raw`{"raw_arguments":"  pr  preserve\t\"quoted\"  \\ text\nsecond line  \n","parsed_ticket":"preserve\t\"quoted\"  \\ text\nsecond line","delivery_mode":"PR","input_status":"COMPLETE"}` +
      "\n",
  );
});

test("keeps established malformed-input errors", () => {
  const result = runParser(["parse", "--raw-arguments"]);
  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("FAIL: --raw-arguments requires exactly one value\n");
});
