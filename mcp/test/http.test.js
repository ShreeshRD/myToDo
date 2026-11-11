import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { FakeApi, FIXED_CLOCK, makeConfig, makeRawTask } from "./fixtures.js";

async function startApp(api) {
  const config = makeConfig({ port: 0, host: "127.0.0.1" });
  const app = createApp({ api, clock: FIXED_CLOCK, config });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  return { server, port, url: `http://127.0.0.1:${port}` };
}

async function withClient(fn) {
  const api = new FakeApi({
    tasks: [
      makeRawTask({ id: 1, name: "Today task", taskDate: "2026-10-28" }),
      makeRawTask({ id: 2, name: "Overdue task", taskDate: "2026-10-26" }),
    ],
  });
  const { server, url } = await startApp(api);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`));
  try {
    await client.connect(transport);
    await fn({ client, url, api });
  } finally {
    await client.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("initialize", async () => {
  await withClient(async ({ client }) => {
    assert.equal(client.getServerVersion().name, "todo-mcp");
  });
});

test("toolsList", async () => {
  await withClient(async ({ client }) => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [
      "complete_task",
      "count_tasks",
      "create_task",
      "delete_task",
      "find_task",
      "get_day",
      "get_week",
      "list_projects",
      "push_task",
      "uncomplete_task",
      "update_task",
    ]);
    assert.equal(tools.length, 11);
  });
});

test("callGetDay", async () => {
  await withClient(async ({ client }) => {
    const result = await client.callTool({ name: "get_day", arguments: {} });
    const body = JSON.parse(result.content[0].text);
    assert.equal(body.today, "2026-10-28");
    assert.deepEqual(body.week, { start: "2026-10-26", end: "2026-11-01" });
    assert.ok(Array.isArray(body.tasks));
    assert.ok(Array.isArray(body.overdue));
    assert.equal(body.tasks.length, 1);
    assert.equal(body.overdue.length, 1);
  });
});

test("getMcpReturns405", async () => {
  const api = new FakeApi({});
  const { server, url } = await startApp(api);
  try {
    const res = await fetch(`${url}/mcp`);
    assert.equal(res.status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("deleteMcpReturns405", async () => {
  const api = new FakeApi({});
  const { server, url } = await startApp(api);
  try {
    const res = await fetch(`${url}/mcp`, { method: "DELETE" });
    assert.equal(res.status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("corsPreflightAllowed", async () => {
  const api = new FakeApi({});
  const { server, url } = await startApp(api);
  try {
    const res = await fetch(`${url}/mcp`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3001",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:3001");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("corsPreflightDisallowed", async () => {
  const api = new FakeApi({});
  const { server, url } = await startApp(api);
  try {
    const res = await fetch(`${url}/mcp`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    assert.equal(res.headers.get("access-control-allow-origin"), null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("health", async () => {
  const api = new FakeApi({});
  const { server, url } = await startApp(api);
  try {
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.api, "http://127.0.0.1:8000");
    assert.equal(body.today, "2026-10-28");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
