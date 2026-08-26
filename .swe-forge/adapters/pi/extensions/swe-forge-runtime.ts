import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ACTIVE_MARKER = "SWE-FORGE ACTIVE RUN";
const NORMALIZED_INVOCATION_MARKER = "[SWE-FORGE NORMALIZED INVOCATION]";
const INVOCATION_ARGUMENTS_MARKER = "Raw invocation arguments:";
const MAX_INVOCATION_BYTES = 256 * 1024;
const MAX_STATE_FILES = 64;
const MAX_FIELD_LENGTH = 160;
const RUN_STATE_ENV_VARS = ["SWE_FORGE_RUN_STATE", "SWE_FORGE_STATE"];
const SUBAGENT_TOOL_NAME = "swe_forge_subagent";
const SUBAGENT_PROTOCOL_VERSION = 1;
const SUBAGENT_READ_ONLY_TOOLS = ["read", "grep", "find", "ls"] as const;
const SUBAGENT_WRITABLE_TOOLS = ["read", "grep", "find", "ls", "edit", "write", "bash"] as const;
const SUBAGENT_CAPABILITY_MARKER = "[SWE-FORGE OPTIONAL SUBAGENT CAPABILITY]";


interface NormalizedInvocation {
	raw_arguments: string;
	parsed_ticket: string;
	requested_mode: "AUTO" | "SOLO" | "SUBAGENTS";
	requested_delivery: "DEFAULT" | "GUIDED" | "PR";
	delivery_mode: "GUIDED" | "PR";
	input_status: "COMPLETE" | "EMPTY" | "INCOMPLETE";
	consumed_tokens: string[];
}

/**
 * Pi-specific runtime bridge for SWE Forge.
 *
 * The canonical workflow remains in the support tree. This extension only
 * translates Pi lifecycle events into capability observations and consumes the
 * small authoritative continuation block in a run-state snapshot.
 */

function readText(filePath: string): string | undefined {
	try {
		return fs.readFileSync(filePath, "utf8");
	} catch {
		return undefined;
	}
}

function readJson(filePath: string): Record<string, any> | undefined {
	const text = readText(filePath);
	if (!text) return undefined;
	try {
		const value = JSON.parse(text);
		return value && typeof value === "object" ? value : undefined;
	} catch {
		return undefined;
	}
}



function stateFile(input: string): string | undefined {
	const candidate = input.trim();
	if (!candidate) return undefined;
	try {
		const stat = fs.statSync(candidate);
		if (stat.isDirectory()) return path.join(candidate, "run-state.yaml");
		if (stat.isFile()) return candidate;
	} catch {
		return undefined;
	}
	return undefined;
}

function canonicalPath(input: string): string {
	try {
		return fs.realpathSync(input);
	} catch {
		return path.resolve(input);
	}
}

function addStatePath(paths: Set<string>, input: string | undefined): void {
	if (!input || paths.size >= MAX_STATE_FILES) return;
	const resolved = stateFile(input);
	if (resolved) paths.add(canonicalPath(resolved));
}

function readPointer(pointer: string): string | undefined {
	const text = readText(pointer)?.trim();
	if (!text) return undefined;
	const firstLine = text.split(/\r?\n/)[0]?.trim();
	if (!firstLine || firstLine.startsWith("#")) return undefined;
	return path.isAbsolute(firstLine) ? firstLine : path.resolve(path.dirname(pointer), firstLine);
}

function addRunDirectory(paths: Set<string>, directory: string): void {
	try {
		if (!fs.statSync(directory).isDirectory()) return;
		addStatePath(paths, directory);
		for (const entry of fs.readdirSync(directory, { withFileTypes: true }).slice(0, MAX_STATE_FILES)) {
			if (!entry.isDirectory()) continue;
			addStatePath(paths, path.join(directory, entry.name));
		}
	} catch {
		// State discovery is best effort; an unavailable capability is not an error.
	}
}

function discoverStatePaths(cwd: string): Set<string> {
	const paths = new Set<string>();
	for (const variable of RUN_STATE_ENV_VARS) addStatePath(paths, process.env[variable]);

	const projectRuns = path.join(cwd, ".swe-forge", "runs");
	for (const pointerName of ["active", "active-run-state", "current"]) {
		const pointer = path.join(projectRuns, pointerName);
		const target = readPointer(pointer);
		addStatePath(paths, target);
		addStatePath(paths, pointer);
	}
	addRunDirectory(paths, projectRuns);
	addStatePath(paths, path.join(cwd, ".swe-forge", "run-state.yaml"));

	// An explicit run-state environment variable is a deliberate host pointer.
	// Avoid broad temporary-state discovery overriding it with an unrelated
	// concurrent fixture or run.
	const hasExplicitRunState = RUN_STATE_ENV_VARS.some((variable) => Boolean(process.env[variable]?.trim()));
	if (!hasExplicitRunState) {
		// The normal external location is $TMPDIR/swe-forge/<run-id>/run-state.yaml.
		// Also inspect the temporary directories used by development fixtures, but
		// keep the scan bounded and filter candidates by checkout below.
		const tempRoot = os.tmpdir();
		addRunDirectory(paths, path.join(tempRoot, "swe-forge"));
		try {
			for (const entry of fs.readdirSync(tempRoot, { withFileTypes: true })) {
				if (!entry.isDirectory() || !entry.name.startsWith("swe-forge")) continue;
				addRunDirectory(paths, path.join(tempRoot, entry.name));
				if (paths.size >= MAX_STATE_FILES) break;
			}
		} catch {
			// Unknown temporary-state capability is handled as no active state.
		}
	}
	return paths;
}


interface ActiveRun {
	filePath: string;
	stateId: string;
	status: string;
	workflowActive: boolean;
	delegationAuthorized: boolean;
	preferredTopology: string;
	currentTopology: string;
	deliveryMode: string;
	phase: string;
	step: string;
	awaiting: string;
	nextActionKind: string;
	nextActionTarget: string;
	acceptance: readonly string[];
	safeBoundary: boolean;
	prNumber: string;
	prState: string;
}

function stateToolPath(): string | undefined {
	const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
	const candidates = [
		path.join(os.homedir(), ".pi", "agent", "swe-forge", ".swe-forge", "tools", "swe-forge-state"),
		path.join(sourceRoot, ".swe-forge", "tools", "swe-forge-state"),
	];
	for (const candidate of candidates) {
		try {
			if (fs.statSync(candidate).isFile()) return candidate;
		} catch {
			// A missing installation preserves the canonical fallback.
		}
	}
	return undefined;
}

interface CanonicalExecResult {
	code?: unknown;
	stdout?: unknown;
}

interface CanonicalExecutor {
	exec(
		command: string,
		args: readonly string[],
		options: { timeout: number },
	): Promise<CanonicalExecResult> | CanonicalExecResult;
}

function hasCanonicalExecutor(value: unknown): value is CanonicalExecutor {
	return isRecord(value) && typeof value.exec === "function";
}

async function canonicalJson(pi: unknown, command: string, args: string[]): Promise<unknown> {
	if (!hasCanonicalExecutor(pi)) return undefined;
	try {
		const result = await pi.exec(command, args, { timeout: 5000 });
		if (result?.code !== 0 || typeof result.stdout !== "string") return undefined;
		return JSON.parse(result.stdout.trim());
	} catch {
		return undefined;
	}
}

function projectionString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.length > 0 ? value.slice(0, MAX_FIELD_LENGTH) : fallback;
}


function activeRunProjection(value: unknown): ActiveRun | undefined {
	if (!isRecord(value) || value.active !== true) return undefined;
	const routing = isRecord(value.routing) ? value.routing : undefined;
	const continuation = isRecord(value.continuation) ? value.continuation : undefined;
	const nextAction = continuation && isRecord(continuation.next_action) ? continuation.next_action : undefined;
	const delivery = continuation && isRecord(continuation.delivery) ? continuation.delivery : undefined;
	if (
		typeof value.state_file !== "string" ||
		typeof value.run_id !== "string" ||
		typeof value.status !== "string" ||
		typeof value.delivery_mode !== "string" ||
		!routing ||
		typeof routing.preferred !== "string" ||
		typeof routing.current !== "string" ||
		!continuation ||
		typeof continuation.workflow_active !== "boolean"
	) {
		return undefined;
	}
	return {
		filePath: value.state_file,
		stateId: value.run_id,
		status: value.status,
		workflowActive: continuation.workflow_active,
		delegationAuthorized: value.delegation_authorized === true,
		preferredTopology: routing.preferred,
		currentTopology: routing.current,
		deliveryMode: value.delivery_mode,
		phase: projectionString(continuation.phase, "none"),
		step: projectionString(continuation.step, "none"),
		awaiting: projectionString(continuation.awaiting, "none"),
		nextActionKind: projectionString(nextAction?.kind, "none"),
		nextActionTarget: projectionString(nextAction?.target, "none"),
		acceptance: stringArray(nextAction?.acceptance) ?? [],
		safeBoundary: continuation.safe_boundary === true,
		prNumber: projectionString(delivery?.pr_number, "none"),
		prState: projectionString(delivery?.pr_state, "none"),
	};
}

async function resolveActiveRuns(pi: any, cwd: string): Promise<ActiveRun[]> {
	const tool = stateToolPath();
	if (!tool) return [];
	const args = ["resolve-active", "--checkout", cwd, "--all"];
	for (const candidate of discoverStatePaths(cwd)) args.push("--candidate", candidate);
	const value = await canonicalJson(pi, tool, args);
	if (!isRecord(value) || !Array.isArray(value.states)) return [];
	return value.states.map(activeRunProjection).filter((run): run is ActiveRun => Boolean(run));
}


interface SubagentToolObservation {
	available: boolean;
	status: "available" | "configured-but-inactive" | "unavailable";
}

interface SubagentCapabilitiesRecord {
	readonly protocolVersion?: unknown;
	readonly packageVersion?: unknown;
	readonly pi?: unknown;
	readonly isolation?: unknown;
	readonly trust?: unknown;
	readonly sweForge?: unknown;
	readonly roles?: unknown;
	readonly availableProfiles?: unknown;
	readonly profileTools?: unknown;
	readonly compatibilityErrors?: unknown;
	readonly readOnlyParallelSupport?: unknown;
	readonly writableConcurrencySupport?: unknown;
	readonly nestedDelegationSupport?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): readonly string[] | undefined {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return undefined;
	return value as readonly string[];
}

function sameToolSet(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((tool) => right.includes(tool));
}

function observeSubagentTool(pi: any): SubagentToolObservation {
	try {
		if (typeof pi.getAllTools !== "function") {
			return { available: false, status: "unavailable" };
		}
		const allTools = pi.getAllTools();
		const configured = Array.isArray(allTools) && allTools.some((tool) => tool?.name === SUBAGENT_TOOL_NAME);
		if (!configured) return { available: false, status: "unavailable" };
		if (typeof pi.getActiveTools !== "function") {
			return { available: true, status: "available" };
		}
		const activeTools = pi.getActiveTools();
		const active = Array.isArray(activeTools) && activeTools.includes(SUBAGENT_TOOL_NAME);
		return active
			? { available: true, status: "available" }
			: { available: false, status: "configured-but-inactive" };
	} catch {
		return { available: false, status: "unavailable" };
	}
}

function topology(value: string): string {
	return value.trim().toUpperCase();
}


function subagentRoutingFallbackReason(run: ActiveRun | undefined, current: string): string {
	if (!run) {
		return [
			"Canonical routing is UNKNOWN because no active, checkout-matching SWE-Forge run-state is discoverable.",
			"Use the existing SOLO/sequential fallback.",
			"Capability discovery may proceed, but before action=run persist a complete active schema-v4 run-state with routing.current: SUBAGENTS and request action=capabilities again.",
			"The worker briefing does not establish canonical routing.",
		].join(" ");
	}
	if (current === "UNKNOWN") {
		return [
			"Canonical routing is UNKNOWN because the active SWE-Forge run-state does not expose a usable current topology.",
			"Use the existing SOLO/sequential fallback until routing.current is persisted as SUBAGENTS.",
		].join(" ");
	}
	return `Canonical routing selected ${current}; use the existing SOLO/sequential fallback rather than delegation.`;
}

function extractInvocationArguments(prompt: unknown): string | undefined {
	if (typeof prompt !== "string") return undefined;
	const marker = prompt.indexOf(INVOCATION_ARGUMENTS_MARKER);
	if (marker < 0) return undefined;
	let start = marker + INVOCATION_ARGUMENTS_MARKER.length;
	if (prompt.startsWith("\r\n", start)) start += 2;
	else if (prompt[start] === "\n" || prompt[start] === "\r") start += 1;
	else if (prompt[start] === " ") start += 1;
	return prompt.slice(start);
}

function invocationParserPath(): string | undefined {
	const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
	const candidates = [
		path.join(os.homedir(), ".pi", "agent", "swe-forge", ".swe-forge", "tools", "swe-forge-invocation"),
		path.join(sourceRoot, ".swe-forge", "tools", "swe-forge-invocation"),
	];
	for (const candidate of candidates) {
		try {
			if (fs.statSync(candidate).isFile()) return candidate;
		} catch {
			// A missing installation falls back to the canonical SOLO/bootstrap path.
		}
	}
	return undefined;
}

function workerBriefToolPath(): string | undefined {
	const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
	const candidates = [
		path.join(os.homedir(), ".pi", "agent", "swe-forge", ".swe-forge", "tools", "swe-forge-worker-brief"),
		path.join(sourceRoot, ".swe-forge", "tools", "swe-forge-worker-brief"),
	];
	for (const candidate of candidates) {
		try {
			if (fs.statSync(candidate).isFile()) return candidate;
		} catch {
			// A missing installation preserves the canonical SOLO/sequential fallback.
		}
	}
	return undefined;
}

async function validateWorkerBriefing(pi: any, briefing: string, signal?: AbortSignal): Promise<string | undefined> {
	const validator = workerBriefToolPath();
	if (!validator || typeof pi.exec !== "function") {
		return "the canonical worker-brief validator is unavailable";
	}
	let directory: string | undefined;
	try {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "swe-forge-worker-brief-"));
		const briefPath = path.join(directory, "worker-brief.yaml");
		fs.writeFileSync(briefPath, briefing, { encoding: "utf8", mode: 0o600 });
		const result = await pi.exec(validator, ["validate", "--brief", briefPath], { signal, timeout: 5000 });
		if (result?.code !== 0) {
			const detail = typeof result?.stderr === "string" && result.stderr.trim() ? result.stderr.trim() : "structural validation failed";
			return detail.slice(0, MAX_FIELD_LENGTH);
		}
		return undefined;
	} catch {
		return "the canonical worker-brief validator could not be executed";
	} finally {
		if (directory) {
			try {
				fs.rmSync(directory, { recursive: true, force: true });
			} catch {
				// The temporary validation directory is run-local and best-effort.
			}
		}
	}
}

function normalizedInvocation(value: unknown, rawArguments: string): NormalizedInvocation | undefined {
	if (!isRecord(value) || value.raw_arguments !== rawArguments || typeof value.parsed_ticket !== "string") {
		return undefined;
	}
	const requestedMode = value.requested_mode;
	const requestedDelivery = value.requested_delivery;
	const deliveryMode = value.delivery_mode;
	const inputStatus = value.input_status;
	const consumedTokens = value.consumed_tokens;
	if (
		(requestedMode !== "AUTO" && requestedMode !== "SOLO" && requestedMode !== "SUBAGENTS") ||
		(requestedDelivery !== "DEFAULT" && requestedDelivery !== "GUIDED" && requestedDelivery !== "PR") ||
		(deliveryMode !== "GUIDED" && deliveryMode !== "PR") ||
		(inputStatus !== "COMPLETE" && inputStatus !== "EMPTY" && inputStatus !== "INCOMPLETE") ||
		!Array.isArray(consumedTokens) ||
		!consumedTokens.every((token) => typeof token === "string")
	) {
		return undefined;
	}
	return {
		raw_arguments: rawArguments,
		parsed_ticket: value.parsed_ticket,
		requested_mode: requestedMode,
		requested_delivery: requestedDelivery,
		delivery_mode: deliveryMode,
		input_status: inputStatus,
		consumed_tokens: [...consumedTokens],
	};
}

async function parseInvocation(pi: any, rawArguments: string): Promise<NormalizedInvocation | undefined> {
	if (Buffer.byteLength(rawArguments, "utf8") > MAX_INVOCATION_BYTES) return undefined;
	const parser = invocationParserPath();
	if (!parser || typeof pi.exec !== "function") return undefined;
	try {
		const result = await pi.exec(parser, ["parse", "--raw-arguments", rawArguments], { timeout: 5000 });
		if (result?.code !== 0 || typeof result.stdout !== "string") return undefined;
		return normalizedInvocation(JSON.parse(result.stdout.trim()), rawArguments);
	} catch {
		return undefined;
	}
}

function invocationFactsPrompt(invocation: NormalizedInvocation): string {
	return [
		NORMALIZED_INVOCATION_MARKER,
		JSON.stringify(invocation),
		"The shared parser produced these invocation facts. Do not reinterpret command syntax; use requested_mode and requested_delivery as requests, and make automatic topology decisions from the software task and canonical policy.",
	].join("\n");
}

function isSWEForgeInvocation(prompt: unknown): boolean {
	return (
		typeof prompt === "string" &&
		(prompt.includes("The user explicitly invoked SWE Forge through Pi.") ||
			extractInvocationArguments(prompt) !== undefined)
	);
}

function subagentCapabilityPrompt(observation: SubagentToolObservation, run: ActiveRun | undefined): string {
	const current = run ? topology(run.currentTopology) : "UNKNOWN";
	const preferred = run ? topology(run.preferredTopology) : "UNKNOWN";
	return [
		SUBAGENT_CAPABILITY_MARKER,
		`swe_forge_subagent tool observed by the Pi adapter: ${observation.status}.`,
		`current topology: ${current} (preferred: ${preferred})`,
		"Canonical routing owns whether to use this shared-checkout capability; use it only for one bounded SUBAGENTS task.",
		"Call action=capabilities first and require the requested role and READ_ONLY/WRITABLE profile before action=run.",
		"With UNKNOWN topology, capabilities is discovery only: persist matching active schema-v4 state with routing.current: SUBAGENTS before action=run, then renegotiate.",
		"Pass only the canonical worker_briefing projection to action=run. Missing or incompatible capability falls back to SOLO/sequential.",
	].join("\n");
}

function capabilityRecord(value: unknown): SubagentCapabilitiesRecord | undefined {
	return isRecord(value) ? (value as SubagentCapabilitiesRecord) : undefined;
}

function validateCapabilities(value: unknown, role?: unknown, profile?: unknown): string | undefined {
	const capabilities = capabilityRecord(value);
	if (!capabilities) return "capabilities response was not an object";
	if (capabilities.protocolVersion !== SUBAGENT_PROTOCOL_VERSION) return "unsupported subagent protocol version";
	if (
		!isRecord(capabilities.pi) ||
		typeof capabilities.pi.compatibilityRange !== "string" ||
		capabilities.pi.versionVerification !== "before_execution"
	) {
		return "capabilities response did not advertise Pi compatibility verification";
	}
	if (
		!isRecord(capabilities.isolation) ||
		capabilities.isolation.contextIsolation !== true ||
		capabilities.isolation.processIsolation !== true ||
		capabilities.isolation.filesystemIsolation !== false ||
		capabilities.isolation.osSandbox !== false
	) {
		return "subagent isolation semantics are incompatible";
	}
	if (
		!isRecord(capabilities.trust) ||
		capabilities.trust.workerPermissions !== "user_os_permissions" ||
		capabilities.trust.sandbox !== false
	) {
		return "subagent trust semantics are incompatible";
	}
	if (
		capabilities.readOnlyParallelSupport !== true ||
		capabilities.writableConcurrencySupport !== false ||
		capabilities.nestedDelegationSupport !== false
	) {
		return "subagent concurrency or recursion semantics are incompatible";
	}
	const errors = Array.isArray(capabilities.compatibilityErrors) ? capabilities.compatibilityErrors : undefined;
	if (errors === undefined) return "capabilities response omitted compatibilityErrors";
	if (errors.length > 0) return "subagent compatibility negotiation reported errors";
	if (!isRecord(capabilities.sweForge) || capabilities.sweForge.installed !== true) {
		return "canonical SWE-Forge installation is unavailable";
	}
	if (role !== undefined) {
		const roles = stringArray(capabilities.roles);
		if (!roles?.includes(String(role))) return `canonical role is not advertised: ${String(role)}`;
	}
	if (profile !== undefined) {
		if (profile !== "READ_ONLY" && profile !== "WRITABLE") return "requested profile is not supported";
		const profiles = stringArray(capabilities.availableProfiles);
		if (!profiles?.includes(profile)) return `requested profile is not advertised: ${String(profile)}`;
		if (!isRecord(capabilities.profileTools)) return "capabilities response omitted profile tools";
		const advertised = stringArray(capabilities.profileTools[profile]);
		const expected = profile === "READ_ONLY" ? SUBAGENT_READ_ONLY_TOOLS : SUBAGENT_WRITABLE_TOOLS;
		if (!advertised || !sameToolSet(advertised, expected)) {
			return `requested ${String(profile)} tool profile is incompatible`;
		}
	}
	return undefined;
}

function continuityPrompt(run: ActiveRun): string {
	const pr = run.prNumber !== "none" ? `\nPR: #${run.prNumber} ${run.prState}` : "";
	const mergeHint =
		run.deliveryMode === "PR" && (run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge")
			? "\nworkflow shorthand: merged -> /git-sync merged"
			: "";
	const acceptance = run.acceptance.length > 0 ? `\nacceptance: ${run.acceptance.join(" | ")}` : "\nacceptance: none";
	const stateId = projectionString(run.stateId, "unknown");
	return [
		`[${ACTIVE_MARKER}]`,
		`workflow: ticket | topology: ${run.currentTopology} (preferred: ${run.preferredTopology}) | delivery: ${run.deliveryMode}`,
		`phase: ${run.phase} | step: ${run.step} | awaiting: ${run.awaiting}`,
		`safe_boundary: ${run.safeBoundary}`,
		`next_action: ${run.nextActionKind} -> ${run.nextActionTarget}${acceptance}`,
		`run_state: ${stateId}${pr}${mergeHint}`,
		"Authoritative continuation is the current run-state snapshot; do not use a lossy summary to invent a phase or repeat a completed action.",
	].join("\n");
}

interface ContinuationMessageSender {
	sendMessage(
		message: { customType: string; content: string; display: boolean },
		options: { deliverAs: "steer" },
	): unknown;
}

function hasContinuationMessageSender(value: unknown): value is ContinuationMessageSender {
	return isRecord(value) && typeof value.sendMessage === "function";
}

async function reinjectContinuation(pi: unknown, run: ActiveRun): Promise<boolean> {
	if (!hasContinuationMessageSender(pi)) return false;
	try {
		await pi.sendMessage(
			{
				customType: "swe-forge-continuation",
				content: continuityPrompt(run),
				display: false,
			},
			{ deliverAs: "steer" },
		);
		return true;
	} catch {
		return false;
	}
}

function appendRuntimeEntry(pi: any, event: string, run: ActiveRun | undefined, details: Record<string, any> = {}): void {
	if (typeof pi.appendEntry !== "function") return;
	try {
		pi.appendEntry("swe-forge-runtime", {
			event,
			state: run?.stateId ?? "none",
			timestamp: new Date().toISOString(),
			...details,
		});
	} catch {
		// Session observability is optional and never replaces run state.
	}
}


export default function sweForgeRuntime(pi: any) {
	let activeRun: ActiveRun | undefined;
	let activeRunVersion = "none";
	let supersededRunIds = new Set<string>();
	let negotiatedSubagentCapabilities: unknown;
	let invocationActive = false;
	let parsedInvocationPrompt: string | undefined;
	let parsedInvocationAttempted = false;
	let parsedInvocation: NormalizedInvocation | undefined;

	const refresh = async (cwd: string, freshInvocation = false): Promise<ActiveRun | undefined> => {
		const discoveredRuns = await resolveActiveRuns(pi, cwd);
		if (freshInvocation) {
			// Fence every run at the fresh-invocation boundary. Keep this in refresh
			// so every startup hook ignores those stale runs until a different run_id
			// appears.
			supersededRunIds = new Set(discoveredRuns.map((run) => run.stateId));
		}
		const discovered = discoveredRuns.find((run) => !supersededRunIds.has(run.stateId));
		if (discovered && supersededRunIds.size > 0) supersededRunIds.clear();
		activeRun = discovered;
		const nextVersion = activeRun
			? `${activeRun.filePath}:${activeRun.stateId}:${topology(activeRun.currentTopology)}:${topology(activeRun.preferredTopology)}`
			: "none";
		if (nextVersion !== activeRunVersion) {
			activeRunVersion = nextVersion;
			negotiatedSubagentCapabilities = undefined;
		}
		return activeRun;
	};

	const on = (event: string, handler: (payload: any, ctx: any) => any): void => {
		try {
			pi.on(event, handler);
		} catch {
			// Older Pi versions may not expose every lifecycle event. The core
			// remains safe because this adapter is capability-negotiated.
		}
	};

	on("session_start", async (_event, ctx) => {
		await refresh(ctx.cwd);
	});

	on("before_agent_start", async (event, ctx) => {
		const explicitInvocation = isSWEForgeInvocation(event.prompt);
		const run = await refresh(ctx.cwd, explicitInvocation);
		invocationActive = Boolean(run) || explicitInvocation;
		const blocks: string[] = [];
		if (explicitInvocation && !event.systemPrompt?.includes(NORMALIZED_INVOCATION_MARKER)) {
			const rawArguments = extractInvocationArguments(event.prompt);
			if (rawArguments !== undefined) {
				if (!parsedInvocationAttempted || parsedInvocationPrompt !== event.prompt) {
					parsedInvocationAttempted = true;
					parsedInvocationPrompt = event.prompt;
					parsedInvocation = await parseInvocation(pi, rawArguments);
				}
				if (parsedInvocation) blocks.push(invocationFactsPrompt(parsedInvocation));
			}
		}
		if (run && !event.systemPrompt?.includes(`[${ACTIVE_MARKER}]`)) blocks.push(continuityPrompt(run));
		const subagent = observeSubagentTool(pi);
		if (
			run &&
			invocationActive &&
			subagent.available &&
			(topology(run.currentTopology) === "SUBAGENTS" || topology(run.preferredTopology) === "SUBAGENTS") &&
			!event.systemPrompt?.includes(SUBAGENT_CAPABILITY_MARKER)
		) {
			blocks.push(subagentCapabilityPrompt(subagent, run));
		}
		if (blocks.length === 0) return undefined;
		return { systemPrompt: `${event.systemPrompt}\n\n${blocks.join("\n\n")}` };
	});

	on("tool_call", async (event, ctx) => {
		if (event.toolName !== SUBAGENT_TOOL_NAME) return undefined;
		const run = await refresh(ctx.cwd);
		const input = isRecord(event.input) ? event.input : {};
		const action = input.action;
		const observation = observeSubagentTool(pi);
		const current = run ? topology(run.currentTopology) : "UNKNOWN";
		const preferred = run ? topology(run.preferredTopology) : "UNKNOWN";

		if (!invocationActive) {
			return {
				block: true,
				reason: "swe_forge_subagent is only available during an explicitly invoked SWE-Forge run; use the normal workflow instead.",
			};
		}
		if (action !== "capabilities" && action !== "run") {
			return { block: true, reason: "The SWE-Forge subagent action must be capabilities or run." };
		}
		if (!observation.available) {
			return {
				block: true,
				reason: `The optional swe_forge_subagent capability is ${observation.status}; use the existing SOLO/sequential fallback.`,
			};
		}
		if (action === "capabilities") {
			if (run && current !== "SUBAGENTS" && preferred !== "SUBAGENTS") {
				return {
					block: true,
					reason: subagentRoutingFallbackReason(run, current),
				};
			}
			return undefined;
		}
		if (current !== "SUBAGENTS") {
			return {
				block: true,
				reason: subagentRoutingFallbackReason(run, current),
			};
		}
		const capabilityError = validateCapabilities(negotiatedSubagentCapabilities, input.role, input.profile);
		if (capabilityError) {
			return {
				block: true,
				reason: `Subagent capability negotiation is incomplete or incompatible: ${capabilityError}. Call action=capabilities first or use the canonical fallback.`,
			};
		}
		if (typeof input.workerBriefing !== "string" || input.workerBriefing.trim().length === 0) {
			return {
				block: true,
				reason: "A non-empty workerBriefing worker_briefing/v1 projection is required for subagent execution.",
			};
		}
		if (input.expectedOutputContract !== "result" && input.expectedOutputContract !== "review") {
			return { block: true, reason: "The expected canonical output contract must be result or review." };
		}
		const briefingError = await validateWorkerBriefing(pi, input.workerBriefing, ctx.signal);
		if (briefingError) {
			return {
				block: true,
				reason: `Canonical worker briefing validation failed: ${briefingError}. Use the renderer or the SOLO/sequential fallback.`,
			};
		}
		return undefined;
	});

	on("tool_result", async (event, ctx) => {
		if (event.toolName !== SUBAGENT_TOOL_NAME || !isRecord(event.input)) return undefined;
		const run = await refresh(ctx.cwd);
		if (event.input.action === "capabilities") {
			const error = event.isError ? "capability tool returned an error" : validateCapabilities(event.details);
			negotiatedSubagentCapabilities = error ? undefined : event.details;
			appendRuntimeEntry(pi, "subagent_capabilities_observed", run, {
				available: !error,
				protocol_version: capabilityRecord(event.details)?.protocolVersion ?? "unknown",
				reason: error ?? "negotiated",
			});
			return undefined;
		}
		if (event.input.action === "run") {
			const details = isRecord(event.details) ? event.details : undefined;
			const validation = details && isRecord(details.validation) ? details.validation : undefined;
			appendRuntimeEntry(pi, "subagent_run_observed", run, {
				status: event.isError ? "failed" : validation?.status ?? "completed",
				role: event.input.role ?? "unknown",
				profile: event.input.profile ?? "unknown",
			});
		}
		return undefined;
	});

	on("input", async (event, ctx) => {
		if (event.source === "extension" || event.text?.trim().toLowerCase() !== "merged") return undefined;
		const run = await refresh(ctx.cwd);
		if (!run || run.deliveryMode !== "PR") return undefined;
		const awaitingMerge = run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge";
		if (!awaitingMerge) return undefined;
		return { action: "transform", text: "/git-sync merged" };
	});

	on("session_before_compact", async (_event, ctx) => {
		activeRun = await refresh(ctx.cwd);
	});

	on("session_compact", async (event, ctx) => {
		const run = await refresh(ctx.cwd);
		if (run && event?.willRetry === true) await reinjectContinuation(pi, run);
	});
}
