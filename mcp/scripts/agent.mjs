#!/usr/bin/env node
/**
 * Agent smoke bridge: MCP tools + local llama-server (OpenAI chat completions).
 *
 * Usage:
 *   node scripts/agent.mjs "What are my tasks for today?"
 *   node scripts/agent.mjs --max-rounds 6 "Add a task called buy milk tomorrow"
 *   LLAMA_URL=http://127.0.0.1:9742 MCP_URL=http://127.0.0.1:8765/mcp node scripts/agent.mjs "..."
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const LLAMA_URL = process.env.LLAMA_URL ?? "http://127.0.0.1:9742";
const MCP_URL = process.env.MCP_URL ?? "http://127.0.0.1:8765/mcp";
const MODEL = process.env.LLAMA_MODEL ?? "My-Qwen";
const MAX_ROWS = 6;

function parseArgs(argv) {
  const args = argv.slice(2);
  let maxRounds = MAX_ROWS;
  const parts = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-rounds") {
      maxRounds = Number(args[++i]);
      continue;
    }
    parts.push(args[i]);
  }
  return { prompt: parts.join(" ").trim(), maxRounds };
}

function zodToOpenApi(schema) {
  // MCP tools expose JSON Schema already via listTools()
  return schema?.type === "object"
    ? schema
    : { type: "object", properties: schema?.properties ?? {}, required: schema?.required ?? [] };
}

function toOpenAiTools(tools) {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: zodToOpenApi(t.inputSchema),
    },
  }));
}

async function callLlama(messages, tools) {
  const body = {
    model: MODEL,
    messages,
    temperature: 0.2,
    max_tokens: 512,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const res = await fetch(`${LLAMA_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`llama HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

async function callMcpTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args ?? {} });
  const text = result?.content?.[0]?.text ?? "";
  const isError = result?.isError === true;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return { isError, parsed, text };
}

async function fetchToday() {
  try {
    const healthUrl = MCP_URL.replace(/\/mcp\/?$/, "/health");
    const res = await fetch(healthUrl);
    if (res.ok) {
      const body = await res.json();
      if (body?.today) return body.today;
    }
  } catch {
    // fall through
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main() {
  const { prompt, maxRounds } = parseArgs(process.argv);
  if (!prompt) {
    console.error('Usage: node scripts/agent.mjs [--max-rounds N] "your prompt"');
    process.exit(2);
  }

  const client = new Client({ name: "agent-smoke", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);

  const { tools } = await client.listTools();
  const openAiTools = toOpenAiTools(tools);
  console.error(`[agent] ${tools.length} MCP tools → ${MODEL} @ ${LLAMA_URL}`);
  console.error(`[agent] prompt: ${prompt}`);

  const today = await fetchToday();
  const messages = [
    {
      role: "system",
      content:
        "You are a local todo assistant. Use the provided tools for any task lookup or mutation. " +
        `Today is ${today} (Asia/Kolkata). Use this exact date when a tool needs YYYY-MM-DD. ` +
        "For questions about today, call get_day with NO arguments (omit date). " +
        "For this week, call get_week with no arguments. " +
        "Use count_tasks only when the user asks for a count with explicit filters. " +
        "Prefer get_day's counts.tasks_open and counts.overdue over inventing your own date range. " +
        "After tool results, give a short plain-text answer based ONLY on tool output. " +
        "If a tool returns empty because you passed a wrong date, call it again omitting date. " +
        "Do not invent task ids or names.",
    },
    { role: "user", content: prompt },
  ];

  let done = false;
  for (let round = 1; round <= maxRounds && !done; round++) {
    process.stderr.write(`[agent] round ${round}: chat completion...\n`);
    const completion = await callLlama(messages, openAiTools);
    const choice = completion.choices?.[0];
    if (!choice) {
      throw new Error("No choices in llama response");
    }
    const msg = choice.message;
    const toolCalls = msg.tool_calls ?? [];

    if (toolCalls.length === 0) {
      console.log(msg.content ?? "");
      console.error(`[agent] done in ${round} round(s)`);
      done = true;
      break;
    }

    messages.push(msg);
    for (const call of toolCalls) {
      const name = call.function?.name;
      let args = {};
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      process.stderr.write(`[agent] tool ${name} ${JSON.stringify(args)}\n`);
      let content;
      try {
        const out = await callMcpTool(client, name, args);
        content = out.text;
        process.stderr.write(
          `[agent] → ${out.isError ? "ERROR " : "ok "}${content.slice(0, 220)}${content.length > 220 ? "…" : ""}\n`
        );
      } catch (error) {
        content = JSON.stringify({ error: "tool_call_failed", message: String(error?.message ?? error) });
        process.stderr.write(`[agent] → TOOL FAIL ${content}\n`);
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content,
      });
    }
  }

  if (!done) {
    console.error(`[agent] stopped after ${maxRounds} rounds without a final answer`);
    process.exit(1);
  }

  await client.close();
}

main().catch((error) => {
  console.error("[agent] fatal:", error);
  process.exit(1);
});
