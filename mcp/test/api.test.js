import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { TodoApi, ApiError } from "../src/api.js";

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("queryBuildsParams", async () => {
  const seen = {};
  const { server, port } = await startServer((req, res) => {
    seen.url = req.url;
    res.setHeader("content-type", "application/json");
    res.end("[]");
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await api.query({
      q: "photo",
      exactName: "",
      project: null,
      start: "2026-10-01",
      status: "open",
      order: "asc",
      limit: 10,
    });
    const url = new URL(seen.url, "http://x");
    assert.equal(url.pathname, "/todo/query");
    assert.equal(url.searchParams.get("q"), "photo");
    assert.equal(url.searchParams.has("exactName"), false);
    assert.equal(url.searchParams.has("project"), false);
    assert.equal(url.searchParams.get("start"), "2026-10-01");
    assert.equal(url.searchParams.get("status"), "open");
    assert.equal(url.searchParams.get("order"), "asc");
    assert.equal(url.searchParams.get("limit"), "10");
  } finally {
    await closeServer(server);
  }
});

test("countBuildsParams", async () => {
  const seen = {};
  const { server, port } = await startServer((req, res) => {
    seen.url = req.url;
    res.end('{"count":1,"open":1,"completed":0}');
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await api.count({ project: "Personal", status: "open" });
    const url = new URL(seen.url, "http://x");
    assert.equal(url.pathname, "/todo/count");
    assert.equal(url.searchParams.get("project"), "Personal");
    assert.equal(url.searchParams.get("status"), "open");
  } finally {
    await closeServer(server);
  }
});

test("getItem404", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.statusCode = 404;
    res.end("");
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await assert.rejects(
      () => api.getItem(99),
      (err) => err instanceof ApiError && err.code === "task_not_found" && err.status === 404
    );
  } finally {
    await closeServer(server);
  }
});

test("getItem200", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ id: 1, name: "A" }));
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    const item = await api.getItem(1);
    assert.deepEqual(item, { id: 1, name: "A" });
  } finally {
    await closeServer(server);
  }
});

test("addSendsQueryParams", async () => {
  const seen = {};
  const { server, port } = await startServer((req, res) => {
    seen.method = req.method;
    seen.url = req.url;
    res.end('{"status":"Added","item":{}}');
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await api.add({ category: "None", name: "X", taskDate: "2026-10-28", priority: 0, longTerm: false });
    assert.equal(seen.method, "POST");
    const url = new URL(seen.url, "http://x");
    assert.equal(url.pathname, "/todo/add");
    assert.equal(url.searchParams.get("category"), "None");
    assert.equal(url.searchParams.get("name"), "X");
    assert.equal(url.searchParams.get("taskDate"), "2026-10-28");
    assert.equal(url.searchParams.get("longTerm"), "false");
  } finally {
    await closeServer(server);
  }
});

test("updateSendsFieldAndValue", async () => {
  const seen = {};
  const { server, port } = await startServer((req, res) => {
    seen.method = req.method;
    seen.url = req.url;
    res.end('{"status":"Updated","item":{}}');
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await api.update(5, "priority", 2);
    assert.equal(seen.method, "POST");
    const url = new URL(seen.url, "http://x");
    assert.equal(url.pathname, "/todo/update");
    assert.equal(url.searchParams.get("id"), "5");
    assert.equal(url.searchParams.get("field"), "priority");
    assert.equal(url.searchParams.get("value"), "2");

    await api.update(5, "longTerm", true);
    const url2 = new URL(seen.url, "http://x");
    assert.equal(url2.searchParams.get("value"), "true");
  } finally {
    await closeServer(server);
  }
});

test("updateReturnsLogicalError", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.end('{"status":"Error: Item not found","item":null}');
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    const result = await api.update(99, "taskName", "X");
    assert.equal(result.status, "Error: Item not found");
  } finally {
    await closeServer(server);
  }
});

test("deleteReturnsBoolean", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.end("false");
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    const result = await api.delete(1);
    assert.equal(result, false);
  } finally {
    await closeServer(server);
  }
});

test("projectsParsed", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.end('[{"name":"None","count":1}]');
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    const projects = await api.projects();
    assert.deepEqual(projects, [{ name: "None", count: 1 }]);
  } finally {
    await closeServer(server);
  }
});

test("timeout", async () => {
  const { server, port } = await startServer(() => {
    // never respond
  });
  try {
    const api = new TodoApi({
      baseUrl: `http://127.0.0.1:${port}`,
      timeoutMs: 50,
    });
    await assert.rejects(
      () => api.query({}),
      (err) => err instanceof ApiError && err.code === "backend_timeout"
    );
  } finally {
    await closeServer(server);
  }
});

test("unreachable", async () => {
  const api = new TodoApi({
    baseUrl: "http://127.0.0.1:1",
    timeoutMs: 500,
  });
  await assert.rejects(
    () => api.query({}),
    (err) => err instanceof ApiError && err.code === "backend_unreachable"
  );
});

test("invalidJson", async () => {
  const { server, port } = await startServer((_req, res) => {
    res.end("not-json");
  });
  try {
    const api = new TodoApi({ baseUrl: `http://127.0.0.1:${port}` });
    await assert.rejects(
      () => api.query({}),
      (err) => err instanceof ApiError && err.code === "invalid_response"
    );
  } finally {
    await closeServer(server);
  }
});
