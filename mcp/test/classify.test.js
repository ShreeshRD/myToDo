import test from "node:test";
import assert from "node:assert/strict";
import {
  parseArgs,
  extractTasks,
  dedupeById,
  selectCandidates,
  chunk,
  buildSchema,
  buildMessages,
  parseClassifications,
  classifyBatch,
  selectConfident,
  applyPredictions,
} from "../scripts/classify.mjs";

function completion(content) {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        choices: [{ message: { role: "assistant", content } }],
      }),
  };
}

function failure(status = 400, body = "bad request") {
  return { ok: false, status, text: async () => body };
}

test("parseArgs defaults to a dry run on the current week", () => {
  const opts = parseArgs(["node", "classify.mjs"]);
  assert.equal(opts.apply, false);
  assert.equal(opts.scope, "week");
  assert.equal(opts.weekOffset, 0);
  assert.equal(opts.confidence, 0.6);
  assert.equal(opts.batchSize, 8);
  assert.equal(opts.mcpUrl, "http://127.0.0.1:8765/mcp");
});

test("parseArgs accepts flags and equals syntax", () => {
  const opts = parseArgs([
    "node",
    "classify.mjs",
    "--apply",
    "--scope=day",
    "--limit",
    "10",
    "--batch-size=4",
    "--confidence=0.8",
    "--include-completed",
  ]);
  assert.equal(opts.apply, true);
  assert.equal(opts.scope, "day");
  assert.equal(opts.limit, 10);
  assert.equal(opts.batchSize, 4);
  assert.equal(opts.confidence, 0.8);
  assert.equal(opts.includeCompleted, true);
});

test("parseArgs rejects invalid values", () => {
  assert.throws(() => parseArgs(["node", "x", "--scope", "month"]), /scope/);
  assert.throws(() => parseArgs(["node", "x", "--limit", "-1"]), /limit/);
  assert.throws(() => parseArgs(["node", "x", "--batch-size", "0"]), /batch-size/);
  assert.throws(() => parseArgs(["node", "x", "--confidence", "2"]), /confidence/);
  assert.throws(() => parseArgs(["node", "x", "--wat"]), /Unknown option/);
});

test("extractTasks flattens week days and dedupes day + overdue", () => {
  const week = {
    days: [
      { date: "2026-10-26", tasks: [{ id: 1 }, { id: 2 }] },
      { date: "2026-10-27", tasks: [{ id: 3 }] },
      { date: "2026-10-28", tasks: [] },
    ],
  };
  assert.deepEqual(
    extractTasks("week", week).map((t) => t.id),
    [1, 2, 3]
  );

  const day = {
    tasks: [{ id: 1 }, { id: 2 }],
    overdue: [{ id: 2 }, { id: 3 }],
  };
  assert.deepEqual(
    dedupeById(extractTasks("day", day)).map((t) => t.id),
    [1, 2, 3]
  );
});

test("selectCandidates keeps only open unclassified tasks", () => {
  const tasks = [
    { id: 1, project: "None", complete: false },
    { id: 2, project: "", complete: false },
    { id: 3, project: "None", complete: true },
    { id: 4, project: "Work", complete: false },
    { id: 5, project: "None", complete: false },
  ];
  assert.deepEqual(
    selectCandidates(tasks).map((t) => t.id),
    [1, 2, 5]
  );
  assert.deepEqual(
    selectCandidates(tasks, { includeCompleted: true }).map((t) => t.id),
    [1, 2, 3, 5]
  );
});

test("chunk splits into fixed-size batches", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});

test("buildSchema constrains project to the provided names", () => {
  const schema = buildSchema(["Work", "Personal", "None"]);
  assert.deepEqual(
    schema.properties.classifications.items.properties.project.enum,
    ["Work", "Personal", "None"]
  );
  assert.equal(schema.additionalProperties, false);
});

test("buildMessages includes the task fields and no ids leak", () => {
  const messages = buildMessages({
    projects: ["Work"],
    tasks: [{ id: 7, name: "Ship report", date: "2026-10-30", priority: 2, long_term: true }],
  });
  const payload = JSON.parse(messages[1].content);
  assert.deepEqual(payload.projects, ["Work"]);
  assert.deepEqual(payload.tasks, [
    {
      id: 7,
      name: "Ship report",
      date: "2026-10-30",
      priority: 2,
      long_term: true,
    },
  ]);
  assert.match(messages[0].content, /JSON only/);
});

test("parseClassifications canonicalizes projects and rejects bad rows", () => {
  const result = parseClassifications(
    JSON.stringify({
      classifications: [
        { id: 1, project: "work", confidence: 0.9 },
        { id: 2, project: "Travel", confidence: 0.7 },
        { id: 99, project: "Work", confidence: 0.9 },
        { id: 3, project: "Work", confidence: "high" },
        { id: 4, project: "work", confidence: 0.4 },
      ],
    }),
    { allowedProjects: ["Work", "Personal", "None"], taskIds: [1, 2, 3, 4, 5] }
  );

  assert.deepEqual(result.accepted, [
    { id: 1, project: "Work", confidence: 0.9 },
    { id: 4, project: "Work", confidence: 0.4 },
  ]);
  assert.deepEqual(result.missing, [5]);
  assert.deepEqual(
    result.rejected.map((r) => r.reason),
    ["unknown_project", "unknown_id", "invalid_confidence"]
  );
});

test("parseClassifications strips a JSON code fence", () => {
  const result = parseClassifications(
    '```json\n{"classifications":[{"id":1,"project":"Work","confidence":0.8}]}\n```',
    { allowedProjects: ["Work"], taskIds: [1] }
  );
  assert.equal(result.accepted[0].project, "Work");
});

test("parseClassifications throws on non-JSON output", () => {
  assert.throws(
    () =>
      parseClassifications("I think this is work", {
        allowedProjects: ["Work"],
        taskIds: [1],
      }),
    /non-JSON/
  );
});

test("classifyBatch retries json_object when json_schema is unsupported", async () => {
  const bodies = [];
  const responses = [
    failure(400, "response_format json_schema unsupported"),
    completion(
      JSON.stringify({
        classifications: [{ id: 1, project: "Work", confidence: 0.9 }],
      })
    ),
  ];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return responses.shift();
  };

  const result = await classifyBatch(
    [{ id: 1, name: "Ship report", date: "2026-10-30", priority: 0, long_term: false }],
    {
      projects: ["Work", "None"],
      llamaUrl: "http://127.0.0.1:9742",
      model: "My-Qwen",
      fetchImpl,
    }
  );

  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].response_format.type, "json_schema");
  assert.equal(bodies[1].response_format.type, "json_object");
  assert.equal(bodies[1].temperature, 0);
  assert.deepEqual(result.accepted, [
    { id: 1, project: "Work", confidence: 0.9 },
  ]);
});

test("classifyBatch surfaces llama HTTP errors", async () => {
  const fetchImpl = async () => failure(500, "boom");
  await assert.rejects(
    classifyBatch([{ id: 1, name: "x" }], {
      projects: ["Work"],
      llamaUrl: "http://127.0.0.1:9742",
      model: "My-Qwen",
      fetchImpl,
    }),
    /llama HTTP 500/
  );
});

test("selectConfident drops low confidence and None labels", () => {
  const predictions = [
    { id: 1, project: "Work", confidence: 0.9 },
    { id: 2, project: "Work", confidence: 0.59 },
    { id: 3, project: "None", confidence: 0.99 },
  ];
  assert.deepEqual(selectConfident(predictions, 0.6), [
    { id: 1, project: "Work", confidence: 0.9 },
  ]);
});

test("applyPredictions updates each task and reports failures", async () => {
  const calls = [];
  const client = {
    async callTool({ name, arguments: args }) {
      calls.push({ name, args });
      if (args.id === 2) {
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify({ message: "nope" }) }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
      };
    },
  };

  const result = await applyPredictions(
    client,
    [
      { id: 1, project: "Work", confidence: 0.9 },
      { id: 2, project: "Personal", confidence: 0.8 },
    ]
  );

  assert.equal(result.applied, 1);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].message, /update_task failed: nope/);
  assert.deepEqual(calls, [
    { name: "update_task", args: { id: 1, project: "Work" } },
    { name: "update_task", args: { id: 2, project: "Personal" } },
  ]);
});
