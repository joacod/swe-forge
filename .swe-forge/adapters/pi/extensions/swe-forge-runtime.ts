import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const ACTIVE_MARKER = "SWE-FORGE ACTIVE RUN";
const DEFAULT_RESERVE_TOKENS = 16_384;
const COMPACTION_COOLDOWN_MS = 30_000;
const MAX_STATE_FILES = 64;
const ACTIVE_STATUSES = new Set(["planning", "running", "reviewing", "repairing", "blocked"]);
const TERMINAL_STATUSES = new Set(["accepted", "failed"]);
const RUN_STATE_ENV_VARS = ["SWE_FORGE_RUN_STATE", "SWE_FORGE_STATE"];

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

function unquote(value: string): string {
	let result = value.trim();
	const comment = result.search(/\s+#/);
	if (comment >= 0) result = result.slice(0, comment).trim();
	if ((result.startsWith("\"") && result.endsWith("\"")) || (result.startsWith("'") && result.endsWith("'"))) {
		result = result.slice(1, -1);
	}
	return result;
}

/**
 * Parse only scalar dotted paths from the deliberately simple run-state YAML.
 * This is not a general YAML parser: rejecting complex or malformed values is
 * safer than guessing workflow state in a continuity hook.
 */
function parseScalarYaml(text: string): Map<string, string> {
	const values = new Map<string, string>();
	const stack: Array<{ indent: number; key: string }> = [];

	for (const line of text.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith("#") || /^\s*-/.test(line)) continue;
		const match = line.match(/^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
		if (!match) continue;
		const indent = match[1].replace(/\t/g, "  ").length;
		const key = match[2];
		while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
		const dotted = [...stack.map((entry) => entry.key), key].join(".");
		const rawValue = match[3];
		if (rawValue === undefined || rawValue.trim() === "") {
			stack.push({ indent, key });
		} else {
			values.set(dotted, unquote(rawValue));
		}
	}
	return values;
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
	return paths;
}

function numberOrUndefined(value: string | undefined): number | undefined {
	if (!value || value === "unknown" || value === "none") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function boolValue(value: string | undefined): boolean | undefined {
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

function stateMatchesCwd(values: Map<string, string>, cwd: string): boolean {
	const project = canonicalPath(cwd);
	const paths = [values.get("invocation_checkout.path"), values.get("delivery_checkout.path")].filter(
		(value): value is string => Boolean(value),
	);
	return paths.some((value) => canonicalPath(value) === project);
}

interface ActiveRun {
	filePath: string;
	stateId: string;
	updatedAt: number;
	status: string;
	workflowActive: boolean;
	preferredTopology: string;
	currentTopology: string;
	deliveryMode: string;
	phase: string;
	step: string;
	awaiting: string;
	nextActionKind: string;
	nextActionTarget: string;
	expectedContextTokens?: number;
	safeBoundary: boolean;
	projectedPressure: string;
	contextStatus: string;
	prNumber: string;
	prState: string;
}

function parseActiveRun(filePath: string, cwd: string): ActiveRun | undefined {
	const text = readText(filePath);
	if (!text) return undefined;
	const values = parseScalarYaml(text);
	if (values.get("workflow") !== "swe-forge" || !stateMatchesCwd(values, cwd)) return undefined;

	const status = values.get("status") ?? "unknown";
	const explicitActive = boolValue(values.get("continuation.workflow_active"));
	const workflowActive = explicitActive ?? (ACTIVE_STATUSES.has(status) && !TERMINAL_STATUSES.has(status));
	if (!workflowActive || TERMINAL_STATUSES.has(status)) return undefined;

	let updatedAt = 0;
	const recordedTime = values.get("continuation.updated_at");
	if (recordedTime) {
		const parsedTime = Date.parse(recordedTime);
		if (Number.isFinite(parsedTime)) updatedAt = parsedTime;
	}
	try {
		updatedAt = Math.max(updatedAt, fs.statSync(filePath).mtimeMs);
	} catch {
		return undefined;
	}

	const stateId = values.get("run_id") ?? path.basename(path.dirname(filePath));
	return {
		filePath,
		stateId,
		updatedAt,
		status,
		workflowActive,
		preferredTopology: values.get("routing.preferred") ?? values.get("preferred_mode") ?? values.get("execution_mode") ?? "unknown",
		currentTopology: values.get("routing.current") ?? values.get("routing.selected") ?? values.get("execution_mode") ?? "unknown",
		deliveryMode: values.get("continuation.delivery.mode") ?? values.get("delivery_mode") ?? "unknown",
		phase: values.get("continuation.phase") ?? values.get("current_wave") ?? "unknown",
		step: values.get("continuation.step") ?? "none",
		awaiting: values.get("continuation.awaiting") ?? "none",
		nextActionKind: values.get("continuation.next_action.kind") ?? "none",
		nextActionTarget: values.get("continuation.next_action.target") ?? "none",
		expectedContextTokens: numberOrUndefined(values.get("continuation.next_action.expected_context_tokens")),
		safeBoundary: boolValue(values.get("continuation.safe_boundary")) ?? false,
		projectedPressure: values.get("routing.context_value.projected_pressure") ?? "unknown",
		contextStatus: values.get("context.status") ?? "unknown",
		prNumber: values.get("continuation.delivery.pr_number") ?? "none",
		prState: values.get("continuation.delivery.pr_state") ?? "none",
	};
}

function resolveActiveRun(cwd: string): ActiveRun | undefined {
	const candidates = Array.from(discoverStatePaths(cwd))
		.map((filePath) => parseActiveRun(filePath, cwd))
		.filter((run): run is ActiveRun => Boolean(run));
	candidates.sort((left, right) => right.updatedAt - left.updatedAt || left.filePath.localeCompare(right.filePath));
	return candidates[0];
}

function continuityPrompt(run: ActiveRun): string {
	const pr = run.prNumber !== "none" ? `\nPR: #${run.prNumber} ${run.prState}` : "";
	const mergeHint =
		run.deliveryMode === "PR" && (run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge")
			? "\nworkflow shorthand: merged -> /git-sync merged"
			: "";
	return [
		`[${ACTIVE_MARKER}]`,
		`workflow: ticket | topology: ${run.currentTopology} (preferred: ${run.preferredTopology}) | delivery: ${run.deliveryMode}`,
		`phase: ${run.phase} | step: ${run.step} | awaiting: ${run.awaiting}`,
		`next_action: ${run.nextActionKind} -> ${run.nextActionTarget}`,
		`run_state: ${run.stateId}${pr}${mergeHint}`,
		"Authoritative continuation is the current run-state snapshot; do not use a lossy summary to invent a phase or repeat a completed action.",
	].join("\n");
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

function configuredReserveTokens(): number {
	const settingsPath = path.join(os.homedir(), ".pi", "agent", "settings.json");
	const settings = readJson(settingsPath);
	const configured = settings?.compaction?.reserveTokens;
	return typeof configured === "number" && Number.isFinite(configured) && configured > 0
		? configured
		: DEFAULT_RESERVE_TOKENS;
}

function compactionReason(run: ActiveRun, usage: { tokens: number | null; contextWindow: number }): string | undefined {
	if (!run.safeBoundary || usage.tokens === null || !Number.isFinite(usage.contextWindow) || usage.contextWindow <= 0) return undefined;
	const remaining = usage.contextWindow - usage.tokens;
	const reserve = configuredReserveTokens();
	const hostPressure = run.contextStatus === "near-limit" || run.contextStatus === "overflow" || run.projectedPressure === "high";
	const expected = run.expectedContextTokens;
	// The Pi reserve is a host-specific documented default. The next-action
	// estimate comes from durable Forge state; without either signal, do not guess.
	if (expected === undefined && !hostPressure) return undefined;
	const projectedNeed = expected ?? 0;
	if (remaining > reserve + projectedNeed) return undefined;
	return `remaining=${Math.max(0, remaining)} reserve=${reserve} expected_next=${expected ?? "unknown"}`;
}

export default function sweForgeRuntime(pi: any) {
	let activeRun: ActiveRun | undefined;
	let compactionInFlight = false;
	let lastCompactionAt = 0;
	let lastCompactionState = "";

	const refresh = (cwd: string): ActiveRun | undefined => {
		activeRun = resolveActiveRun(cwd);
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

	on("session_start", (_event, ctx) => {
		refresh(ctx.cwd);
	});

	on("before_agent_start", (event, ctx) => {
		const run = refresh(ctx.cwd);
		if (!run) return undefined;
		const prompt = continuityPrompt(run);
		if (event.systemPrompt?.includes(`[${ACTIVE_MARKER}]`)) return undefined;
		return { systemPrompt: `${event.systemPrompt}\n\n${prompt}` };
	});

	on("input", async (event, ctx) => {
		if (event.source === "extension" || event.text?.trim().toLowerCase() !== "merged") return undefined;
		const run = refresh(ctx.cwd);
		if (!run || run.deliveryMode !== "PR") return undefined;
		const awaitingMerge = run.awaiting === "user_merge" || run.nextActionKind === "verify_and_sync_merge";
		if (!awaitingMerge) return undefined;
		return { action: "transform", text: "/git-sync merged" };
	});

	on("session_before_compact", (event, ctx) => {
		activeRun = refresh(ctx.cwd);
		appendRuntimeEntry(pi, "compaction_started", activeRun, {
			reason: event?.reason ?? "unknown",
			willRetry: event?.willRetry ?? false,
		});
	});

	on("session_compact", (event, ctx) => {
		compactionInFlight = false;
		activeRun = refresh(ctx.cwd);
		appendRuntimeEntry(pi, "compaction_completed", activeRun, {
			reason: event?.reason ?? "unknown",
			willRetry: event?.willRetry ?? false,
		});
	});

	on("agent_settled", (_event, ctx) => {
		const run = refresh(ctx.cwd);
		if (!run || compactionInFlight || ctx.hasPendingMessages?.()) return;
		if (typeof ctx.getContextUsage !== "function" || typeof ctx.compact !== "function") return;
		const usage = ctx.getContextUsage();
		if (!usage) return;
		const reason = compactionReason(run, usage);
		const stateVersion = `${run.filePath}:${run.updatedAt}`;
		if (
			!reason ||
			stateVersion === lastCompactionState ||
			Date.now() - lastCompactionAt < COMPACTION_COOLDOWN_MS
		) return;

		lastCompactionAt = Date.now();
		lastCompactionState = stateVersion;
		compactionInFlight = true;
		appendRuntimeEntry(pi, "proactive_compaction_requested", run, {
			reason,
			tokens: usage.tokens,
			contextWindow: usage.contextWindow,
		});
		ctx.compact({
			customInstructions:
				"Preserve the active SWE-Forge continuation as a reminder only. The external run-state is authoritative. Do not invent delivery state or repeat completed actions; after compaction, re-read run state and Git before continuing.",
			onComplete: () => {
				compactionInFlight = false;
			},
			onError: () => {
				compactionInFlight = false;
			},
		});
	});
}
