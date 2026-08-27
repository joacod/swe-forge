import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { MAX_JSON_BYTES } from "../src/core/worker/json";

interface ProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

type CorpusInput = string | Uint8Array;
type WorkerKind = "brief" | "result";

interface CorpusCase {
  readonly name: string;
  readonly worker: WorkerKind;
  readonly args: readonly string[];
  readonly input: CorpusInput;
  readonly expectedExitCode: 0 | 1;
  readonly expectedStdout?: string;
  readonly stderrIncludes?: string;
}

const brief = {
  worker_briefing: {
    schema: "worker-brief/v1",
    task_id: "reader-check",
    worker: { role: "researcher", mode: "delegated_worker", depth: 1, recursive_delegation: false },
    objective: "Inspect the bounded worker boundary.",
    acceptance: ["The bounded worker returns only accepted evidence."],
    repository: {
      instructions: ["AGENTS.md"],
      allowed_reads: ["src/parser.ts#parseRecord"],
      allowed_writes: ["none"],
    },
    architecture_decisions: ["Use the canonical parser interface."],
    validation: [{ command: "scripts/test-parser", requirement: "required", condition: "always", side_effects: "local-only" }],
    permissions: {
      write_access: "read-only",
      topology: "SUBAGENTS",
      allowed_actions: ["read", "validation"],
      forbidden_actions: ["delivery", "recursive delegation", "peer communication", "scope expansion", "topology decisions"],
    },
    return: {
      profile: "READ_ONLY",
      contract: ".swe-forge/contracts/result.md",
      expected_output: ["FINDINGS and EVIDENCE"],
    },
  },
};

const writableResult = {
  RESULT_PROFILE: "WRITABLE",
  STATUS: "DONE",
  TASK_ID: "writer-check",
  BASE_SHA: "1111111111111111111111111111111111111111",
  HEAD_SHA: "2222222222222222222222222222222222222222",
  BRANCH: "refactor/worker-port",
  FILES_CHANGED: ["src/core/worker/json.ts"],
  GIT_STATE: ["clean"],
  VALIDATION: [{
    command: "scripts/test-swe-forge-results",
    requirement: "required",
    condition: "always",
    applies: true,
    result: "passed",
    evidence: "worker result fixture",
  }],
  FINDINGS: ["The typed worker result preserves the writable boundary."],
  EVIDENCE: ["src/core/worker/result.ts"],
};

const briefText = JSON.stringify(brief);
const briefInner = JSON.stringify(brief.worker_briefing);
const result = {
  RESULT_PROFILE: "READ_ONLY",
  STATUS: "DONE",
  TASK_ID: "reader-check",
  FINDINGS: ["The bounded worker returned the requested finding."],
  EVIDENCE: ["src/parser.ts#parseRecord"],
  RISKS: null,
  RECOMMENDED_ACTION: null,
};
const resultText = JSON.stringify(result);
const writableResultText = JSON.stringify(writableResult);
const sizeLimitInput = new Uint8Array(MAX_JSON_BYTES + 1).fill(0x20);
const invalidUtf8Input = new Uint8Array([
  ...new TextEncoder().encode('{"RESULT_PROFILE":"'),
  0xc3,
  0x28,
  0x22,
  0x7d,
]);

/*
 * The expected outcomes were captured from the Python worker ports before the
 * cutover. The corpus intentionally runs without Python so it remains a
 * regression boundary rather than a runtime dependency.
 */
const corpus: readonly CorpusCase[] = [
  {
    name: "brief accepts escaped strings",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: JSON.stringify({
      ...brief,
      worker_briefing: { ...brief.worker_briefing, objective: 'Inspect "quoted" \\ escaped.' },
    }),
    expectedExitCode: 0,
    expectedStdout: "PASS: worker briefing validated\n",
  },
  {
    name: "brief rejects an escaped duplicate root key",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: String.raw`{"worker_briefing":${briefInner},"w\u006frker_briefing":${briefInner}}`,
    expectedExitCode: 1,
    stderrIncludes: "duplicate object key: worker_briefing",
  },
  {
    name: "brief rejects an escaped duplicate nested key",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace(
      '"recursive_delegation":false',
      String.raw`"r\u0065cursive_delegation":false,"recursive_delegation":false`,
    ),
    expectedExitCode: 1,
    stderrIncludes: "duplicate object key: recursive_delegation",
  },
  {
    name: "brief rejects decimal depth like Python",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace('"depth":1', '"depth":1.0'),
    expectedExitCode: 1,
    stderrIncludes: "worker.depth must be a positive integer",
  },
  {
    name: "brief rejects exponent depth like Python",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace('"depth":1', '"depth":1e0'),
    expectedExitCode: 1,
    stderrIncludes: "worker.depth must be a positive integer",
  },
  {
    name: "brief accepts a large positive integer depth",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace('"depth":1', `"depth":${"9".repeat(400)}`),
    expectedExitCode: 0,
    expectedStdout: "PASS: worker briefing validated\n",
  },
  {
    name: "brief rejects invalid JSON constants",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace('"depth":1', '"depth":NaN'),
    expectedExitCode: 1,
    stderrIncludes: "invalid JSON constant: NaN",
  },
  {
    name: "brief rejects malformed JSON",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.slice(0, -1),
    expectedExitCode: 1,
  },
  {
    name: "brief rejects malformed escapes",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: briefText.replace('"reader-check"', String.raw`"reader\u00"`),
    expectedExitCode: 1,
  },
  {
    name: "brief rejects invalid UTF-8",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: invalidUtf8Input,
    expectedExitCode: 1,
    stderrIncludes: "invalid UTF-8",
  },
  {
    name: "brief enforces the byte size limit",
    worker: "brief",
    args: ["validate", "--brief", "-"],
    input: sizeLimitInput,
    expectedExitCode: 1,
    stderrIncludes: "worker briefing exceeds the canonical size limit",
  },
  {
    name: "result accepts escaped strings and null optionals",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: JSON.stringify({ ...result, FINDINGS: ['A "quoted" \\ finding.'] }),
    expectedExitCode: 0,
    expectedStdout: '{"schema":"worker-result/v1","valid":true,"profile":"READ_ONLY","status":"DONE","task_id":"reader-check"}\n',
  },
  {
    name: "result accepts nested object and array validation data",
    worker: "result",
    args: ["validate", "--profile", "WRITABLE", "--task-id", "writer-check", "--result", "-"],
    input: writableResultText,
    expectedExitCode: 0,
    expectedStdout: '{"schema":"worker-result/v1","valid":true,"profile":"WRITABLE","status":"DONE","task_id":"writer-check"}\n',
  },
  {
    name: "result rejects an escaped duplicate key",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: resultText.replace('"TASK_ID":"reader-check"', String.raw`"TASK_ID":"reader-check","T\u0041SK_ID":"other"`),
    expectedExitCode: 1,
    stderrIncludes: "duplicate object key: TASK_ID",
  },
  {
    name: "result rejects a duplicate key inside an array object",
    worker: "result",
    args: ["validate", "--profile", "WRITABLE", "--task-id", "writer-check", "--result", "-"],
    input: writableResultText.replace(
      '"command":"scripts/test-swe-forge-results"',
      String.raw`"command":"scripts/test-swe-forge-results","\u0063ommand":"other"`,
    ),
    expectedExitCode: 1,
    stderrIncludes: "duplicate object key: command",
  },
  {
    name: "result rejects Infinity constants",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: resultText.replace('"STATUS":"DONE"', '"STATUS":Infinity'),
    expectedExitCode: 1,
    stderrIncludes: "invalid JSON constant: Infinity",
  },
  {
    name: "result rejects negative Infinity constants",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: resultText.replace('"STATUS":"DONE"', '"STATUS":-Infinity'),
    expectedExitCode: 1,
    stderrIncludes: "invalid JSON constant: -Infinity",
  },
  {
    name: "result rejects malformed JSON",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: resultText.replace('"EVIDENCE":["src/parser.ts#parseRecord"]', '"EVIDENCE":[}'),
    expectedExitCode: 1,
  },
  {
    name: "result rejects invalid UTF-8",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--task-id", "reader-check", "--result", "-"],
    input: invalidUtf8Input,
    expectedExitCode: 1,
    stderrIncludes: "invalid UTF-8",
  },
  {
    name: "result enforces the byte size limit",
    worker: "result",
    args: ["validate", "--profile", "READ_ONLY", "--result", "-"],
    input: sizeLimitInput,
    expectedExitCode: 1,
    stderrIncludes: "worker result exceeds the canonical size limit",
  },
];

function runTool(worker: WorkerKind, args: readonly string[], input: CorpusInput): ProcessResult {
  const directory = mkdtempSync(join(tmpdir(), "swe-forge-worker-test-"));
  try {
    const inputPath = join(directory, "input.json");
    writeFileSync(inputPath, input);
    const actualArgs = args.map((argument) => (argument === "-" ? inputPath : argument));
    const tool = resolve(import.meta.dir, `../.swe-forge/tools/swe-forge-worker-${worker}`);
    const result = Bun.spawnSync([tool, ...actualArgs], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    return {
      exitCode: result.exitCode,
      stdout: new TextDecoder().decode(result.stdout),
      stderr: new TextDecoder().decode(result.stderr),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const fixture of corpus) {
  test(`worker parity corpus: ${fixture.name}`, () => {
    const result = runTool(fixture.worker, fixture.args, fixture.input);
    expect(result.exitCode).toBe(fixture.expectedExitCode);
    if (fixture.expectedExitCode === 0) {
      const expectedStdout = fixture.expectedStdout;
      if (expectedStdout === undefined) throw new Error("passing parity case must declare expected stdout");
      expect(result.stdout).toBe(expectedStdout);
      expect(result.stderr).toBe("");
    } else {
      expect(result.stdout).toBe("");
      expect(result.stderr.startsWith("FAIL: ")).toBe(true);
      if (fixture.stderrIncludes !== undefined) expect(result.stderr).toContain(fixture.stderrIncludes);
    }
  });
}

test("worker brief inspection preserves the adapter-visible port", () => {
  const result = runTool("brief", ["inspect", "--brief", "-"], briefText);
  expect(result).toEqual({
    exitCode: 0,
    stdout: '{"schema":"worker-brief/v1","valid":true,"task_id":"reader-check","profile":"READ_ONLY","write_access":"read-only"}\n',
    stderr: "",
  });
});
