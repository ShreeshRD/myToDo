#!/usr/bin/env node
/**
 * Classify unclassified tasks into existing projects with a local llama-server.
 *
 * Reads and writes only through the MCP bridge, so it never touches SQLite and
 * defaults to the dev backend (TODO_API_URL=http://127.0.0.1:8000).
 *
 * Usage:
 *   node scripts/classify.mjs                       # dry run, current week
 *   node scripts/classify.mjs --scope day           # today + overdue
 *   node scripts/classify.mjs --apply               # write labels
 *   node scripts/classify.mjs --apply --confidence 0.8 --limit 25
 *   LLAMA_URL=http://127.0.0.1:9742 MCP_URL=http://127.0.0.1:8765/mcp \
 *     node scripts/classify.mjs --apply
 */
import { pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const DEFAULTS = {
  apply: false,
  scope: "week",
  weekOffset: 0,
  limit: 0,
  batchSize: 8,
  confidence: 0.6,
  includeCompleted: false,
  model: process.env.LLAMA_MODEL ?? "My-Qwen",
  llamaUrl: process.env.LLAMA_URL ?? "http://127.0.0.1:9742",
  mcpUrl: process.env.MCP_URL ?? "http://127.0.0.1:8765/mcp",
  timeoutMs: Number(process.env.LLAMA_TIMEOUT_MS ?? 120000),
  help: false,
};

export function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    let value;
    if (arg.startsWith("--") && arg.includes("=")) {
      const at = arg.indexOf("=");
      value = arg.slice(at + 1);
      arg = arg.slice(0, at);
    }

    const takeValue = () => {
      if (value !== undefined) return value;
      const next = args[++i];
      if (next === undefined) throw new Error(`${arg} requires a value`);
      return next;
    };

    switch (arg) {
      case "--apply":
        opts.apply = true;
        break;
      case "--dry-run":
        opts.apply = false;
        break;
      case "--scope": {
        const scope = takeValue();
        if (scope !== "week" && scope !== "day") {
          throw new Error("--scope must be week or day");
        }
        opts.scope = scope;
        break;
      }
      case "--week-offset": {
        const n = Number(takeValue());
        if (!Number.isInteger(n) || n < -52 || n > 52) {
          throw new Error("--week-offset must be an integer between -52 and 52");
        }
        opts.weekOffset = n;
        break;
      }
      case "--limit": {
        const n = Number(takeValue());
        if (!Number.isInteger(n) || n < 0) {
          throw new Error("--limit must be a non-negative integer");
        }
        opts.limit = n;
        break;
      }
      case "--batch-size": {
        const n = Number(takeValue());
        if (!Number.isInteger(n) || n < 1 || n > 50) {
          throw new Error("--batch-size must be an integer between 1 and 50");
        }
        opts.batchSize = n;
        break;
      }
      case "--confidence": {
        const n = Number(takeValue());
        if (!Number.isFinite(n) || n < 0 || n > 1) {
          throw new Error("--confidence must be between 0 and 1");
        }
        opts.confidence = n;
        break;
      }
      case "--include-completed":
        opts.includeCompleted = true;
        break;
      case "--model":
        opts.model = takeValue();
        break;
      case "--llama-url":
        opts.llamaUrl = takeValue();
        break;
      case "--mcp-url":
        opts.mcpUrl = takeValue();
        break;
      case "--timeout":
        opts.timeoutMs = Number(takeValue());
        if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
          throw new Error("--timeout must be a positive number of milliseconds");
        }
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(opts.timeoutMs) || opts.timeoutMs <= 0) {
    throw new Error("LLAMA_TIMEOUT_MS must be a positive number");
  }
  opts.llamaUrl = opts.llamaUrl.replace(/\/+$/, "");

  return opts;
}

export function extractTasks(scope, result) {
  if (scope === "week") {
    return (result?.days ?? []).flatMap((day) => day.tasks ?? []);
  }
  if (scope === "day") {
    return [...(result?.tasks ?? []), ...(result?.overdue ?? [])];
  }
  throw new Error(`Unsupported scope: ${scope}`);
}

export function dedupeById(tasks) {
  const seen = new Set();
  const out = [];
  for (const task of tasks) {
    if (task?.id == null || seen.has(task.id)) continue;
    seen.add(task.id);
    out.push(task);
  }
  return out;
}

export function selectCandidates(tasks, { includeCompleted = false } = {}) {
  return tasks.filter((task) => {
    if (task?.id == null) return false;
    if (!includeCompleted && task.complete === true) return false;
    return normalizeProject(task.project) === "None";
  });
}

function normalizeProject(value) {
  if (value == null || String(value).trim() === "") return "None";
  return String(value).trim();
}

export function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function buildSchema(projects) {
  return {
    type: "object",
    properties: {
      classifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            project: { type: "string", enum: projects },
            confidence: { type: "number" },
          },
          required: ["id", "project", "confidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["classifications"],
    additionalProperties: false,
  };
}

export function buildMessages({ projects, tasks }) {
  const system =
    "You classify todo tasks into exactly one existing project. " +
    "Use only the project names provided in the user JSON. " +
    'Use "None" only when no project fits; never invent a project. ' +
    "Base the label on the task name, date, priority, and long_term flag. " +
    "Confidence is a number from 0 to 1. " +
    'Return JSON only, exactly {"classifications":[{"id":1,"project":"Work","confidence":0.9}]}.';

  const payload = {
    projects,
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.name,
      date: task.date,
      priority: task.priority,
      long_term: task.long_term,
    })),
  };

  return [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(payload) },
  ];
}

function stripCodeFence(text) {
  const trimmed = String(text ?? "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseClassifications(text, { allowedProjects, taskIds }) {
  let payload;
  try {
    payload = JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error("model returned non-JSON output");
  }

  const items = Array.isArray(payload?.classifications)
    ? payload.classifications
    : [];
  const validIds = new Set(taskIds);
  const canonical = new Map(
    allowedProjects.map((project) => [project.toLowerCase(), project])
  );
  const accepted = new Map();
  const rejected = [];

  for (const item of items) {
    const id = Number(item?.id);
    if (!Number.isInteger(id) || !validIds.has(id)) {
      rejected.push({ id: item?.id, reason: "unknown_id" });
      continue;
    }

    const rawProject = String(item?.project ?? "").trim();
    const project = canonical.get(rawProject.toLowerCase());
    if (!project) {
      rejected.push({ id, project: rawProject, reason: "unknown_project" });
      continue;
    }

    const confidence = Number(item?.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      rejected.push({ id, reason: "invalid_confidence" });
      continue;
    }

    const previous = accepted.get(id);
    if (previous && previous.confidence >= confidence) {
      rejected.push({ id, reason: "duplicate_id" });
      continue;
    }
    accepted.set(id, { id, project, confidence });
  }

  const rejectedIds = new Set(
    rejected.map((item) => Number(item.id)).filter(Number.isInteger)
  );
  const missing = taskIds.filter(
    (id) => !accepted.has(id) && !rejectedIds.has(id)
  );
  return { accepted: [...accepted.values()], rejected, missing };
}

async function postChat({ llamaUrl, body, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${llamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyBatch(
  batch,
  {
    projects,
    llamaUrl,
    model,
    timeoutMs = DEFAULTS.timeoutMs,
    fetchImpl = fetch,
  }
) {
  const base = {
    model,
    messages: buildMessages({ projects, tasks: batch }),
    temperature: 0,
    max_tokens: Math.min(2048, 128 + batch.length * 48),
  };

  const schemaBody = {
    ...base,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "task_classification",
        strict: true,
        schema: buildSchema(projects),
      },
    },
  };

  let result = await postChat({
    llamaUrl,
    body: schemaBody,
    timeoutMs,
    fetchImpl,
  });

  // Older llama.cpp builds support json_object but not json_schema.
  if (!result.ok && result.status === 400) {
    result = await postChat({
      llamaUrl,
      body: { ...base, response_format: { type: "json_object" } },
      timeoutMs,
      fetchImpl,
    });
  }

  if (!result.ok) {
    throw new Error(
      `llama HTTP ${result.status}: ${result.text.slice(0, 400)}`
    );
  }

  let data;
  try {
    data = JSON.parse(result.text);
  } catch {
    throw new Error("llama returned invalid JSON envelope");
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("llama returned no message content");
  }

  return parseClassifications(content, {
    allowedProjects: projects,
    taskIds: batch.map((task) => task.id),
  });
}

export async function callToolJson(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text =
    result?.content?.find?.((part) => part.type === "text")?.text ??
    result?.content?.[0]?.text ??
    "";

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${name} returned invalid JSON: ${text.slice(0, 200)}`);
  }

  if (result?.isError === true) {
    throw new Error(`${name} failed: ${data?.message ?? data?.error ?? text}`);
  }
  return data;
}

export function selectConfident(predictions, minConfidence) {
  return predictions.filter(
    (item) => item.confidence >= minConfidence && item.project !== "None"
  );
}

export async function applyPredictions(client, predictions, { onProgress } = {}) {
  let applied = 0;
  const failures = [];

  for (const item of predictions) {
    try {
      await callToolJson(client, "update_task", {
        id: item.id,
        project: item.project,
      });
      applied++;
      onProgress?.(item);
    } catch (error) {
      failures.push({ id: item.id, message: String(error?.message ?? error) });
    }
  }

  return { applied, failures };
}

function printTable(rows, columns) {
  if (rows.length === 0) return;
  const widths = columns.map((column) =>
    Math.max(
      column.label.length,
      ...rows.map((row) => String(row[column.key] ?? "").length)
    )
  );
  const line = (cells) =>
    cells
      .map((cell, i) => String(cell).padEnd(widths[i]))
      .join("  ")
      .trimEnd();

  console.log(line(columns.map((column) => column.label)));
  console.log(line(widths.map((width) => "-".repeat(width))));
  for (const row of rows) {
    console.log(line(columns.map((column) => row[column.key] ?? "")));
  }
}

function helpText() {
  return `Classify unclassified tasks with a local llama-server (dry run by default).

Options:
  --apply                 Write labels with update_task (default: dry run)
  --scope week|day        week = current week, day = today + overdue (default: week)
  --week-offset N         Shift the week, -52..52 (default: 0)
  --limit N               Classify at most N tasks (default: 0 = all)
  --batch-size N          Tasks per model call (default: 8)
  --confidence N          Minimum confidence to apply, 0..1 (default: 0.6)
  --include-completed     Include completed unclassified tasks
  --model NAME            llama.cpp model name (default: ${DEFAULTS.model})
  --llama-url URL         llama-server base URL (default: ${DEFAULTS.llamaUrl})
  --mcp-url URL           MCP endpoint (default: ${DEFAULTS.mcpUrl})
  --timeout MS            Per-call timeout (default: ${DEFAULTS.timeoutMs})
  -h, --help              Show this help

Environment: LLAMA_URL, LLAMA_MODEL, LLAMA_TIMEOUT_MS, MCP_URL
The MCP server decides the backend; its dev default is http://127.0.0.1:8000.`;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(helpText());
    return;
  }

  const client = new Client({ name: "task-classifier", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(opts.mcpUrl));

  try {
    await client.connect(transport);
  } catch (error) {
    throw new Error(
      `cannot connect to MCP at ${opts.mcpUrl}: ${error?.message ?? error}`
    );
  }

  try {
    const projectResult = await callToolJson(client, "list_projects");
    const seenProjects = new Set();
    const existing = [];
    for (const project of projectResult.projects ?? []) {
      const name = normalizeProject(project.name);
      const key = name.toLowerCase();
      if (name === "None" || seenProjects.has(key)) continue;
      seenProjects.add(key);
      existing.push(name);
    }

    const projects = [...existing, "None"];
    if (existing.length === 0) {
      throw new Error(
        "no projects exist yet; create one in the app before classifying"
      );
    }

    const scopeArgs =
      opts.scope === "week" ? { week_offset: opts.weekOffset } : {};
    const scopeResult = await callToolJson(
      client,
      opts.scope === "week" ? "get_week" : "get_day",
      scopeArgs
    );

    const truncated =
      scopeResult.truncated === true ||
      scopeResult.truncated?.tasks === true ||
      scopeResult.truncated?.overdue === true;
    if (truncated) {
      console.error(
        "[classify] warning: the MCP capped this scope at 50 tasks; " +
          "use --scope day or a narrower --limit window to cover more"
      );
    }

    let candidates = selectCandidates(extractTasks(opts.scope, scopeResult), {
      includeCompleted: opts.includeCompleted,
    });
    candidates = dedupeById(candidates);
    if (opts.limit > 0) candidates = candidates.slice(0, opts.limit);

    console.error(
      `[classify] ${candidates.length} unclassified task(s), scope=${opts.scope}, ` +
        `projects=${existing.length}, model=${opts.model} @ ${opts.llamaUrl}`
    );
    console.error(
      `[classify] mode=${opts.apply ? "APPLY" : "dry-run"}, ` +
        `min-confidence=${opts.confidence}`
    );

    if (candidates.length === 0) {
      console.log("No unclassified tasks found.");
      return;
    }

    const byId = new Map(candidates.map((task) => [task.id, task]));
    const predictions = [];
    const rejected = [];

    const batches = chunk(candidates, opts.batchSize);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      process.stderr.write(
        `[classify] batch ${i + 1}/${batches.length} (${batch.length} tasks)...\n`
      );

      const result = await classifyBatch(batch, {
        projects,
        llamaUrl: opts.llamaUrl,
        model: opts.model,
        timeoutMs: opts.timeoutMs,
      });

      for (const item of result.accepted) predictions.push(item);
      for (const item of result.rejected) rejected.push(item);
      for (const id of result.missing) rejected.push({ id, reason: "not_returned" });
    }

    const confident = selectConfident(predictions, opts.confidence);
    const lowConfidence = predictions.filter(
      (item) => !confident.includes(item)
    );

    console.log("");
    console.log(
      `${opts.apply ? "Applying" : "Would apply"} ${confident.length} of ${predictions.length} prediction(s) ` +
        `at confidence >= ${opts.confidence}:`
    );
    printTable(
      confident.map((item) => ({
        id: item.id,
        confidence: item.confidence.toFixed(2),
        project: item.project,
        name: byId.get(item.id)?.name ?? "",
      })),
      [
        { key: "id", label: "ID" },
        { key: "confidence", label: "CONF" },
        { key: "project", label: "PROJECT" },
        { key: "name", label: "TASK" },
      ]
    );

    if (!opts.apply) {
      console.log("");
      console.log("Dry run: no tasks were changed. Re-run with --apply to write.");
    } else {
      const { applied, failures } = await applyPredictions(client, confident, {
        onProgress: (item) =>
          process.stderr.write(
            `[classify] updated ${item.id} -> ${item.project}\n`
          ),
      });
      for (const failure of failures) {
        process.stderr.write(
          `[classify] update ${failure.id} failed: ${failure.message}\n`
        );
      }
      console.log("");
      console.log(`Applied ${applied} task(s); ${failures.length} failed.`);
    }

    const skipped = lowConfidence.length + rejected.length;
    if (skipped > 0) {
      console.log(
        `Skipped ${lowConfidence.length} low-confidence/None prediction(s) ` +
          `and ${rejected.length} invalid prediction(s).`
      );
    }
  } finally {
    await client.close().catch(() => {});
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((error) => {
    console.error("[classify] fatal:", error?.message ?? error);
    process.exitCode = 1;
  });
}
