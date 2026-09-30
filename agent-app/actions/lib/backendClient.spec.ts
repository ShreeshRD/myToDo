import { afterEach, describe, expect, it, vi } from "vitest";

import { callBackend } from "./backendClient";

function mockFetch() {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ status: "Updated" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("callBackend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes query params into the URL and sends no body (Spring @RequestParam)", async () => {
    const fetchMock = mockFetch();
    await callBackend({
      method: "POST",
      path: "/todo/update",
      query: { id: 3, field: "taskName", value: "Buy milk & eggs", skip: undefined },
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/todo/update");
    expect(parsed.searchParams.get("id")).toBe("3");
    expect(parsed.searchParams.get("value")).toBe("Buy milk & eggs");
    expect(parsed.searchParams.has("skip")).toBe(false);
    expect(init.body).toBeUndefined();
  });

  it("sends rawBody verbatim as text/plain", async () => {
    const fetchMock = mockFetch();
    const content = '[{"id":"b1","type":"text"}]';
    await callBackend({ method: "POST", path: "/todo/scratchpad", rawBody: content });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe(content);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("text/plain");
  });

  it("still JSON-encodes a body", async () => {
    const fetchMock = mockFetch();
    await callBackend({ method: "POST", path: "/x", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe('{"a":1}');
  });
});
