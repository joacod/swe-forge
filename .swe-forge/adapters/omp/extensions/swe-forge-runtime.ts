import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const INVOCATION_MARKER = "The user explicitly invoked SWE Forge through omp.";
const RAW_ARGUMENTS_MARKER = "Raw invocation arguments:";
const CAPABILITY_MARKER = "[SWE-FORGE OMP NATIVE SUBAGENT CAPABILITY]";
const WORKER_CONTEXT =
	"SWE Forge delegated task execution. The task assignment is the canonical worker-brief/v1 JSON object. Do not infer routing, scope, permissions, or delivery authority from this context.";
const PROFILE_TO_RESULT = {
	"swe-forge-read-only": "READ_ONLY",
	"swe-forge-writable": "WRITABLE",
	"swe-forge-reviewer": "REVIEW",
} as const;
const PROFILE_EXPECTATIONS = {
	// OMP adds its hidden `yield` return tool to every explicit profile tool list.
	"swe-forge-read-only": { tools: ["read", "grep", "glob"], result: "READ_ONLY" },
	"swe-forge-writable": { tools: ["read", "grep", "glob", "edit", "write", "bash"], result: "WRITABLE" },
	"swe-forge-reviewer": { tools: ["read", "grep", "glob"], result: "REVIEW" },
} as const;
const TASK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_STATE_FILES = 64;
const MAX_RESULT_BYTES = 256 * 1024;

type ResultProfile = "READ_ONLY" | "WRITABLE" | "REVIEW";

type ProfileName = keyof typeof PROFILE_TO_RESULT;

interface ActiveRun {
	filePath: string;
	stateId: string;
	updatedAt: number;
	modifiedAt: number;
	status: string;
	delegationAuthorized: boolean;
	currentTopology: string;
	preferredTopology: string;
	deliveryMode: string;
}

interface CapabilityObservation {
	available: boolean;
	reason: string;
	profiles: readonly ProfileName[];
	profileTools: Record<string, readonly string[]>;
	readOnlyParallelSupport: boolean;
	structuredResults: boolean;
	strictResults: boolean;
}

interface PlannedItem {
	index: number;
	name: string;
	profile: ResultProfile;
	agent: ProfileName;
	task: string;
}

interface PendingTaskCall {
	items: PlannedItem[];
	runId: string;
	writable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalPath(value: string): string {
	try {
		return fs.realpathSync(value);
	} catch {
		return path.resolve(value);
	}
}


function safeScalar(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return undefined;
}

function cleanReason(value: unknown, fallback: string): string {
	const text = safeScalar(value)?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
	return text ? text.slice(0, 240) : fallback;
}


function readFile(filePath: string): string | undefined {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch {
		return undefined;
	}
}

function activeAgentDir(pi: any): string {
	try {
		const fromRuntime = pi.pi?.getAgentDir?.();
		if (typeof fromRuntime === "string" && fromRuntime.trim()) return canonicalPath(fromRuntime);
	} catch {
		// Fall through to the documented OMP environment/default.
	}
	const configured = process.env.PI_CODING_AGENT_DIR;
	if (configured?.trim()) return canonicalPath(configured);
	return canonicalPath(path.join(os.homedir(), ".omp", "agent"));
}

function canonicalToolPath(pi: any, name: string): string {
	return path.join(activeAgentDir(pi), "swe-forge", ".swe-forge", "tools", name);
}

function executableFile(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isFile() && (fs.statSync(filePath).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

function addStateCandidate(candidates: Set<string>, value: string | undefined): void {
	if (!value || candidates.size >= MAX_STATE_FILES) return;
	const trimmed = value.trim();
	if (!trimmed) return;
	try {
		const stat = fs.statSync(trimmed);
		const filePath = stat.isDirectory() ? path.join(trimmed, "run-state.yaml") : trimmed;
		if (fs.statSync(filePath).isFile()) candidates.add(canonicalPath(filePath));
	} catch {
		// A missing pointer is a safe unavailable capability.
	}
}

function readPointer(pointer: string): string | undefined {
	const content = readFile(pointer)?.trim();
	if (!content) return undefined;
	const firstLine = content.split(/\r?\n/, 1)[0]?.trim();
	if (!firstLine || firstLine.startsWith("#")) return undefined;
	return path.isAbsolute(firstLine) ? firstLine : path.resolve(path.dirname(pointer), firstLine);
}

function discoverStatePaths(cwd: string): Set<string> {
	const candidates = new Set<string>();
	for (const variable of ["SWE_FORGE_RUN_STATE", "SWE_FORGE_STATE"]) addStateCandidate(candidates, process.env[variable]);

	const projectRuns = path.join(cwd, ".swe-forge", "runs");
	for (const pointerName of ["active", "active-run-state", "current"]) {
		const pointer = path.join(projectRuns, pointerName);
		addStateCandidate(candidates, readPointer(pointer));
	}
	addStateCandidate(candidates, path.join(cwd, ".swe-forge", "run-state.yaml"));
	try {
		for (const entry of fs.readdirSync(projectRuns, { withFileTypes: true })) {
			if (entry.isDirectory()) addStateCandidate(candidates, path.join(projectRuns, entry.name));
			if (candidates.size >= MAX_STATE_FILES) break;
		}
	} catch {
		// Project-local run state is optional.
	}

	const externalRoot = path.join(os.tmpdir(), "swe-forge");
	try {
		for (const entry of fs.readdirSync(externalRoot, { withFileTypes: true })) {
			if (entry.isDirectory()) addStateCandidate(candidates, path.join(externalRoot, entry.name));
			if (candidates.size >= MAX_STATE_FILES) break;
		}
	} catch {
		// External run state is optional; the explicit env path remains supported.
	}
	return candidates;
}
function projectionString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function activeRunProjection(value: unknown): ActiveRun | undefined {
	if (!isRecord(value) || value.active !== true) return undefined;
	const routing = isRecord(value.routing) ? value.routing : undefined;
	if (
		typeof value.state_file !== "string" ||
		typeof value.run_id !== "string" ||
		typeof value.status !== "string" ||
		typeof value.delivery_mode !== "string" ||
		!routing ||
		typeof routing.current !== "string" ||
		typeof routing.preferred !== "string" ||
		typeof value.updated_at_ms !== "number" ||
		!Number.isFinite(value.updated_at_ms) ||
		typeof value.modified_at_ms !== "number" ||
		!Number.isFinite(value.modified_at_ms)
	) {
		return undefined;
	}
	return {
		filePath: value.state_file,
		stateId: value.run_id,
		updatedAt: value.updated_at_ms,
		modifiedAt: value.modified_at_ms,
		status: value.status,
		delegationAuthorized: value.delegation_authorized === true,
		currentTopology: routing.current,
		preferredTopology: routing.preferred,
		deliveryMode: value.delivery_mode,
	};
}

async function discoverActiveRuns(pi: ExtensionAPI, cwd: string): Promise<ActiveRun[]> {
	const args = ["resolve-active", "--checkout", cwd, "--all"];
	for (const candidate of discoverStatePaths(cwd)) args.push("--candidate", candidate);
	const result = await executeCanonicalJson(pi, canonicalToolPath(pi, "swe-forge-state"), args);
	if (!result.ok || !isRecord(result.value) || !Array.isArray(result.value.states)) return [];
	return result.value.states.map(activeRunProjection).filter((run): run is ActiveRun => Boolean(run));
}

async function inspectActiveRun(pi: ExtensionAPI, cwd: string, filePath: string): Promise<ActiveRun | undefined> {
	const result = await executeCanonicalJson(pi, canonicalToolPath(pi, "swe-forge-state"), [
		"inspect",
		"--state",
		filePath,
		"--checkout",
		cwd,
	]);
	return result.ok ? activeRunProjection(result.value) : undefined;
}
function unquote(value: string): string {
	let result = value.trim();
	const comment = result.search(/\s+#/);
	if (comment >= 0) result = result.slice(0, comment).trim();
	if ((result.startsWith("\"") && result.endsWith("\"")) || (result.startsWith("'") && result.endsWith("'"))) {
		result = result.slice(1, -1);
	}
	return result;
}

function parseFrontmatter(text: string): Map<string, string> {
	const result = new Map<string, string>();
	if (!text.startsWith("---")) return result;
	const end = text.indexOf("\n---", 3);
	if (end < 0) return result;
	for (const line of text.slice(3, end).split(/\r?\n/)) {
		const separator = line.indexOf(":");
		if (separator < 0) continue;
		result.set(line.slice(0, separator).trim(), unquote(line.slice(separator + 1)));
	}
	return result;
}

function parseList(value: string | undefined): string[] {
	if (!value) return [];
	const trimmed = value.trim();
	if (trimmed === "[]") return [];
	if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed) && parsed.every(item => typeof item === "string")) return parsed;
		} catch {
			return [];
		}
	}
	return trimmed
		.split(",")
		.map(item => item.trim())
		.filter(Boolean);
}

function projectProfileShadowed(cwd: string, profile: ProfileName): boolean {
	let current = canonicalPath(cwd);
	for (;;) {
		if (fs.existsSync(path.join(current, ".omp", "agents", `${profile}.md`))) return true;
		const parent = path.dirname(current);
		if (parent === current) return false;
		current = parent;
	}
}

function inspectProfiles(pi: any, cwd: string): { ok: boolean; reason: string; profileTools: Record<string, readonly string[]> } {
	const agentDir = activeAgentDir(pi);
	const profileTools: Record<string, readonly string[]> = {};
	for (const [profile, expected] of Object.entries(PROFILE_EXPECTATIONS) as Array<[
		ProfileName,
		(typeof PROFILE_EXPECTATIONS)[ProfileName],
	]>) {
		if (projectProfileShadowed(cwd, profile)) {
			return { ok: false, reason: `project agent definition shadows confined profile ${profile}`, profileTools };
		}
		const profilePath = path.join(agentDir, "agents", `${profile}.md`);
		const content = readFile(profilePath);
		if (!content) return { ok: false, reason: `confined profile is not installed: ${profile}`, profileTools };
		const fields = parseFrontmatter(content);
		const tools = parseList(fields.get("tools"));
		const toolSetMatches = tools.length === expected.tools.length && expected.tools.every(tool => tools.includes(tool));
		if (fields.get("name") !== profile || !toolSetMatches || tools.includes("task")) {
			return { ok: false, reason: `confined profile ${profile} has incompatible tools`, profileTools };
		}
		if (fields.get("spawns") !== "[]" || fields.get("blocking") !== "true") {
			return { ok: false, reason: `confined profile ${profile} does not disable recursion and block for result collection`, profileTools };
		}
		profileTools[profile] = [...tools, "yield"];
	}
	return { ok: true, reason: "confined user profiles observed", profileTools };
}

function observeCapability(pi: any, cwd: string): CapabilityObservation {
	const unavailable = (reason: string): CapabilityObservation => ({
		available: false,
		reason,
		profiles: [],
		profileTools: {},
		readOnlyParallelSupport: false,
		structuredResults: false,
		strictResults: false,
	});
	try {
		if (typeof pi.getAllTools !== "function" || typeof pi.getActiveTools !== "function") {
			return unavailable("current OMP ExtensionAPI does not expose active tool discovery");
		}
		const allTools = pi.getAllTools();
		const taskTool = Array.isArray(allTools) ? allTools.find((tool: any) => tool?.name === "task") : undefined;
		if (!taskTool) return unavailable("native OMP task tool is not present");
		if (!pi.getActiveTools().includes("task")) return unavailable("native OMP task tool is configured but inactive");
		if (taskTool.sourceInfo?.source && taskTool.sourceInfo.source !== "builtin") {
			return unavailable("the active task tool is not the native OMP builtin");
		}
		const description = String(taskTool.description ?? "").toLowerCase();
		const missing = ["tasks", "context", "outputschema", "schemamode"].filter(token => !description.includes(token));
		if (missing.length > 0) return unavailable(`native task surface is missing ${missing.join(", ")}`);
		for (const toolName of ["swe-forge-worker-brief", "swe-forge-worker-result", "swe-forge-state"]) {
			if (!executableFile(canonicalToolPath(pi, toolName))) {
				return unavailable(`canonical ${toolName} tool is unavailable from the active OMP support root`);
			}
		}
		const profiles = inspectProfiles(pi, cwd);
		if (!profiles.ok) return unavailable(profiles.reason);
		return {
			available: true,
			reason: "native task, batch, strict structured output, canonical validators, and confined user profiles observed",
			profiles: Object.keys(PROFILE_TO_RESULT) as ProfileName[],
			profileTools: profiles.profileTools,
			readOnlyParallelSupport: true,
			structuredResults: true,
			strictResults: true,
		};
	} catch (error) {
		return unavailable(`native OMP capability observation failed: ${cleanReason(error, "unknown observation error")}`);
	}
}

function capabilityPrompt(observation: CapabilityObservation, run: ActiveRun | undefined): string {
	const topology = run?.currentTopology ?? "UNKNOWN";
	const lines = [
		CAPABILITY_MARKER,
		`OMP native task capability: ${observation.available ? "available" : "unavailable"}.`,
		`capability evidence: ${observation.reason}.`,
		`canonical routing.current: ${topology}.`,
		"Canonical routing remains the owner of topology selection; this adapter never changes SOLO or SUBAGENTS.",
	];
	if (observation.available) {
		lines.push(
			"For a selected shared-checkout SUBAGENTS run, use the native `task` tool, not a SWE Forge executor clone.",
			"Use agent=swe-forge-read-only for READ_ONLY, agent=swe-forge-writable for WRITABLE, and agent=swe-forge-reviewer for REVIEW.",
			"Pass the validated canonical worker-brief/v1 JSON object unchanged as each native task item's `task` assignment.",
			"The adapter supplies the canonical worker-result JSON Schema with schemaMode=strict and validates the returned JSON directly.",
			"Submit independent read-only questions in one logical native task batch; OMP/the host runtime chooses whether ready items execute concurrently or sequentially.",
			"Writable results must be materialized into and validated against the canonical delivery checkout before sequential acceptance; private host execution paths are not Forge state.",
			"Headless workers have no interactive approval boundary; rely on the confined profile, bounded brief, no task recursion, and root-owned delivery authorization.",
		);
	} else {
		lines.push("Do not call the native task tool for SWE Forge delegation; use the visible SOLO/sequential fallback.");
	}
	if (!run) {
		lines.push("This explicit-invocation observation is discovery only. Persist a valid checkout-matching schema-v5 run-state with routing.current: SUBAGENTS before delegation.");
	} else if (topology !== "SUBAGENTS") {
		lines.push(`The current canonical topology is ${topology}; native shared-checkout delegation is not authorized for this run.`);
	}
	return lines.join("\n");
}


function profileForAgent(agent: unknown): ResultProfile | undefined {
	return typeof agent === "string" && Object.hasOwn(PROFILE_TO_RESULT, agent)
		? PROFILE_TO_RESULT[agent as ProfileName]
		: undefined;
}


interface CanonicalCommandResult {
	ok: boolean;
	detail: string;
	stdout: string;
}

interface CanonicalExecutor {
	exec(
		command: string,
		args: readonly string[],
		options: { timeout: number },
	): Promise<{ code?: unknown; stdout?: unknown; stderr?: unknown }> | { code?: unknown; stdout?: unknown; stderr?: unknown };
}

function hasCanonicalExecutor(value: unknown): value is CanonicalExecutor {
	return isRecord(value) && typeof value.exec === "function";
}

async function executeCanonical(pi: unknown, command: string, args: string[], timeout = 5000): Promise<CanonicalCommandResult> {
	if (!hasCanonicalExecutor(pi)) {
		return { ok: false, detail: "canonical command could not be executed", stdout: "" };
	}
	try {
		const result = await pi.exec(command, args, { timeout });
		const stdout = typeof result.stdout === "string" ? result.stdout : "";
		const stderr = typeof result.stderr === "string" ? result.stderr : "";
		return {
			ok: result.code === 0,
			detail: cleanReason(stderr || stdout, "canonical command failed"),
			stdout,
		};
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical command could not be executed"), stdout: "" };
	}
}

async function executeCanonicalJson(pi: unknown, command: string, args: string[], timeout = 5000): Promise<{
	ok: boolean;
	detail: string;
	value?: unknown;
}> {
	const result = await executeCanonical(pi, command, args, timeout);
	if (!result.ok) return result;
	try {
		return { ...result, value: JSON.parse(result.stdout.trim()) };
	} catch {
		return { ok: false, detail: "canonical command returned malformed JSON", stdout: result.stdout };
	}
}

async function inspectBrief(
	pi: ExtensionAPI,
	briefing: string,
): Promise<{ ok: boolean; detail: string; value?: Record<string, unknown> }> {
	const inspector = canonicalToolPath(pi, "swe-forge-worker-brief");
	let directory: string | undefined;
	try {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "swe-forge-omp-brief-"));
		const filePath = path.join(directory, "worker-brief.json");
		fs.writeFileSync(filePath, briefing, { encoding: "utf8", mode: 0o600 });
		const result = await executeCanonicalJson(pi, inspector, ["inspect", "--brief", filePath]);
		if (!result.ok || !isRecord(result.value)) return { ok: false, detail: result.detail };
		return { ok: true, detail: "canonical worker briefing inspected", value: result.value };
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical worker brief inspector failed") };
	} finally {
		if (directory) {
			try {
				fs.rmSync(directory, { recursive: true, force: true });
			} catch {
				// Temporary inspection material is best-effort cleanup only.
			}
		}
	}
}

async function validateResult(
	pi: ExtensionAPI,
	data: unknown,
	profile: "READ_ONLY" | "WRITABLE",
	taskId: string,
): Promise<{ ok: boolean; detail: string }> {
	const structured = JSON.stringify(data);
	if (structured === undefined) return { ok: false, detail: "native structured data is not JSON-serializable" };
	if (Buffer.byteLength(structured, "utf8") > MAX_RESULT_BYTES) {
		return { ok: false, detail: "canonical worker result exceeded the adapter result limit" };
	}
	const validator = canonicalToolPath(pi, "swe-forge-worker-result");
	let directory: string | undefined;
	try {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "swe-forge-omp-result-"));
		const resultPath = path.join(directory, "worker-result.json");
		fs.writeFileSync(resultPath, structured, { encoding: "utf8", mode: 0o600 });
		const validation = await executeCanonical(pi, validator, [
			"validate",
			"--profile",
			profile,
			"--task-id",
			taskId,
			"--result",
			resultPath,
		]);
		return { ok: validation.ok, detail: validation.detail };
	} catch (error) {
		return { ok: false, detail: cleanReason(error, "canonical worker result validator failed") };
	} finally {
		if (directory) {
			try {
				fs.rmSync(directory, { recursive: true, force: true });
			} catch {
				// Temporary result material is best-effort cleanup only.
			}
		}
	}
}

function nativeItems(input: Record<string, unknown>): { batch: boolean; items: Array<Record<string, unknown>> } | { error: string } {
	if (Array.isArray(input.tasks)) {
		if (Object.hasOwn(input, "task")) return { error: "native batch input may not also contain top-level task" };
		if (input.tasks.length === 0 || !input.tasks.every(isRecord)) return { error: "native task batch must contain non-empty task items" };
		return { batch: true, items: input.tasks };
	}
	if (typeof input.task === "string") return { batch: false, items: [input] };
	return { error: "native task input has no task assignment" };
}


async function structuredSchemaFor(
	pi: ExtensionAPI,
	profile: ResultProfile,
	taskId: string,
): Promise<Record<string, unknown> | undefined> {
	const args = ["schema", "--profile", profile];
	if (profile !== "REVIEW") args.push("--task-id", taskId);
	const result = await executeCanonicalJson(pi, canonicalToolPath(pi, "swe-forge-worker-result"), args);
	if (!result.ok || !isRecord(result.value)) return undefined;
	return result.value;
}

async function prepareTaskInput(
	pi: ExtensionAPI,
	cwd: string,
	input: Record<string, unknown>,
): Promise<{ ok: true; input: Record<string, unknown>; items: PlannedItem[] } | { ok: false; reason: string }> {
	const shape = nativeItems(input);
	if ("error" in shape) return { ok: false, reason: shape.error };
	const planned: PlannedItem[] = [];
	const nextItems: Array<Record<string, unknown>> = [];
	for (const [index, item] of shape.items.entries()) {
		const name = typeof item.name === "string" ? item.name.trim() : "";
		if (!TASK_ID_PATTERN.test(name)) return { ok: false, reason: `native task item ${index + 1} needs a canonical task name` };
		const agent = item.agent;
		const profile = profileForAgent(agent);
		if (!profile || !Object.hasOwn(PROFILE_EXPECTATIONS, agent as ProfileName)) {
			return { ok: false, reason: "native task item must select an installed SWE Forge confined profile" };
		}
		const task = item.task;
		if (typeof task !== "string" || task.trim().length === 0) return { ok: false, reason: `native task item ${name} has no assignment` };
		const brief = await inspectBrief(pi, task);
		if (!brief.ok || !brief.value || brief.value.valid !== true) {
			return { ok: false, reason: `canonical worker briefing inspection failed for ${name}: ${brief.detail}` };
		}
		const canonicalTaskId = brief.value.task_id;
		const canonicalProfile = brief.value.profile;
		const canonicalWriteAccess = brief.value.write_access;
		const expectedWriteAccess = profile === "WRITABLE" ? "read-write" : "read-only";
		if (
			canonicalTaskId !== name ||
			canonicalProfile !== profile ||
			canonicalWriteAccess !== expectedWriteAccess
		) {
			return { ok: false, reason: `canonical worker briefing does not match confined OMP profile or task name ${name}` };
		}
		const outputSchema = await structuredSchemaFor(pi, profile, name);
		if (!outputSchema) return { ok: false, reason: `canonical ${profile} result schema was unavailable for ${name}` };
		planned.push({ index, name, profile, agent: agent as ProfileName, task });
		nextItems.push({ ...item, outputSchema, schemaMode: "strict" });
	}
	const hasWritable = planned.some(item => item.profile === "WRITABLE");
	if (shape.batch && planned.length > 1 && hasWritable) {
		return { ok: false, reason: "shared-checkout writable SWE Forge workers must be launched sequentially, never in one native batch" };
	}
	if (shape.batch) {
		return {
			ok: true,
			input: { ...input, context: WORKER_CONTEXT, tasks: nextItems },
			items: planned,
		};
	}
	const next = { ...input, ...nextItems[0], task: planned[0]!.task };
	if (Object.hasOwn(next, "context")) next.context = WORKER_CONTEXT;
	return { ok: true, input: next, items: planned };
}

function appendRuntimeEntry(pi: any, event: string, run: ActiveRun | undefined, details: Record<string, unknown> = {}): void {
	try {
		if (typeof pi.appendEntry !== "function") return;
		pi.appendEntry("swe-forge-omp-runtime", {
			event,
			state: run?.stateId ?? "none",
			timestamp: new Date().toISOString(),
			...details,
		});
	} catch {
		// Runtime observability is optional and never replaces canonical state.
	}
}

export default function sweForgeRuntime(pi: ExtensionAPI): void {
	let invocationActive = false;
	let fencedRunIds = new Set<string>();
	let activeRun: ActiveRun | undefined;
	let pending = new Map<string, PendingTaskCall>();
	let writableInFlight = false;

	const refresh = async (cwd: string, freshInvocation = false): Promise<ActiveRun | undefined> => {
		const runs = await discoverActiveRuns(pi, cwd);
		if (freshInvocation) fencedRunIds = new Set(runs.map(run => run.stateId));
		const selected = runs.find(run => run.delegationAuthorized && !fencedRunIds.has(run.stateId));
		if (selected && fencedRunIds.size > 0) fencedRunIds.clear();
		activeRun = selected;
		return selected;
	};

	pi.on("before_agent_start", async (event, ctx) => {
		const explicit = event.prompt.includes(INVOCATION_MARKER) || event.prompt.includes(RAW_ARGUMENTS_MARKER);
		if (!explicit) return;
		invocationActive = true;
		const run = await refresh(ctx.cwd, true);
		const observation = observeCapability(pi, ctx.cwd);
		if (event.systemPrompt.some(part => part.includes(CAPABILITY_MARKER))) return;
		return { systemPrompt: [...event.systemPrompt, capabilityPrompt(observation, run)] };
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "task" || !invocationActive) return;
		const run = await refresh(ctx.cwd);
		if (!run) {
			return {
				block: true,
				reason: "OMP native delegation refused: no active checkout-matching schema-v5 SWE Forge run-state is discoverable. Use SOLO/sequential fallback; a worker brief cannot establish routing authority.",
			};
		}
		if (run.currentTopology !== "SUBAGENTS") {
			return {
				block: true,
				reason: `OMP native delegation refused: canonical routing.current is ${run.currentTopology}, not SUBAGENTS. Use the existing SOLO/sequential fallback.`,
			};
		}
		const observation = observeCapability(pi, ctx.cwd);
		if (!observation.available) {
			return { block: true, reason: `OMP native delegation capability is incompatible: ${observation.reason}. Use SOLO/sequential fallback.` };
		}
		const inspected = await inspectActiveRun(pi, ctx.cwd, run.filePath);
		if (
			!inspected ||
			inspected.stateId !== run.stateId ||
			!inspected.delegationAuthorized ||
			inspected.currentTopology !== "SUBAGENTS"
		) {
			return { block: true, reason: "Canonical run-state inspection no longer authorizes delegation. Use SOLO/sequential fallback." };
		}
		const input = isRecord(event.input) ? event.input : {};
		const prepared = await prepareTaskInput(pi, ctx.cwd, input);
		if (!prepared.ok) return { block: true, reason: `${prepared.reason}. Use SOLO/sequential fallback.` };
		const writable = prepared.items.some(item => item.profile === "WRITABLE");
		if (writable && writableInFlight) {
			return {
				block: true,
				reason: "a shared-checkout writable SWE Forge worker is already running; wait for its result before launching another",
			};
		}
		if (writable) writableInFlight = true;
		pending.set(event.toolCallId, { items: prepared.items, runId: run.stateId, writable });
		appendRuntimeEntry(pi, "native_task_prepared", run, {
			items: prepared.items.length,
			read_only_batch: prepared.items.length > 1,
			profiles: prepared.items.map(item => item.agent),
		});
		return { input: prepared.input };
	});

	pi.on("tool_result", async (event, _ctx) => {
		if (event.toolName !== "task" || !invocationActive) return;
		const call = pending.get(event.toolCallId);
		if (!call) return;
		pending.delete(event.toolCallId);
		if (event.isError) {
			if (call.writable) writableInFlight = false;
			appendRuntimeEntry(pi, "native_task_failed", activeRun, { reason: "native task returned an error" });
			return;
		}
		const details = isRecord(event.details) ? event.details : {};
		const results = Array.isArray(details.results) ? details.results : [];
		if (results.length !== call.items.length) {
			if (call.writable) writableInFlight = false;
			const reason = "native task did not return one blocking structured result per bounded assignment";
			appendRuntimeEntry(pi, "native_task_rejected", activeRun, { reason });
			return {
				isError: true,
				content: [{ type: "text", text: `SWE Forge OMP delegation rejected: ${reason}. Use SOLO/sequential fallback.` }],
				details: { ...details, sweForge: { schema: "worker-result/v1", status: "invalid", reason } },
			};
		}
		const validations: Array<Record<string, unknown>> = [];
		for (const [index, planned] of call.items.entries()) {
			const result = isRecord(results[index]) ? results[index] : {};
			const structured = isRecord(result.structuredOutput) ? result.structuredOutput : undefined;
			const data = structured?.data;
			let validation: { ok: boolean; detail: string };
			if (result.exitCode !== 0 || structured?.status !== "valid" || structured?.mode !== "strict") {
				validation = { ok: false, detail: "native task result was not a valid strict structured completion" };
			} else if (planned.profile === "REVIEW") {
				validation = { ok: true, detail: "native review transport accepted by the canonical JSON Schema; root review contract remains authoritative" };
			} else {
				validation = await validateResult(pi, data, planned.profile, planned.name);
			}
			validations.push({ task_id: planned.name, profile: planned.profile, status: validation.ok ? "valid" : "invalid", detail: validation.detail });
			if (!validation.ok) {
				if (call.writable) writableInFlight = false;
				const reason = `${planned.name}: ${validation.detail}`;
				appendRuntimeEntry(pi, "native_task_rejected", activeRun, { reason });
				return {
					isError: true,
					content: [{ type: "text", text: `SWE Forge OMP delegation rejected: ${reason}. Worker output remains untrusted; use SOLO/sequential fallback.` }],
					details: {
						...details,
						sweForge: { schema: "worker-result/v1", status: "invalid", results: validations },
					},
				};
			}
		}
		if (call.writable) writableInFlight = false;
		appendRuntimeEntry(pi, "native_task_validated", activeRun, { results: validations.length });
		return { details: { ...details, sweForge: { schema: "worker-result/v1", status: "valid", results: validations } } };
	});
}
