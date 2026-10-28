import { ApiError } from "./errors.js";

export { ApiError };

function buildUrl(baseUrl, path, params) {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export class TodoApi {
  constructor({ baseUrl, timeoutMs = 5000, fetchImpl = fetch } = {}) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async request(method, path, { params, body } = {}) {
    const url = buildUrl(this.baseUrl, path, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        signal: controller.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new ApiError("backend_timeout", "Backend request timed out");
      }
      throw new ApiError("backend_unreachable", "Cannot reach the todo backend", {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let data;
    if (text === "") {
      data = null;
    } else {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError("invalid_response", "Backend returned invalid JSON", {
          status: response.status,
        });
      }
    }

    if (response.status === 404 && path.startsWith("/todo/item/")) {
      throw new ApiError("task_not_found", `Task ${path.split("/").pop()} not found`, {
        status: 404,
      });
    }

    if (!response.ok) {
      throw new ApiError(
        "backend_error",
        `Backend returned HTTP ${response.status}`,
        { status: response.status }
      );
    }

    return data;
  }

  query(params) {
    return this.request("GET", "/todo/query", { params });
  }

  count(params) {
    return this.request("GET", "/todo/count", { params });
  }

  getItem(id) {
    return this.request("GET", `/todo/item/${id}`);
  }

  projects() {
    return this.request("GET", "/todo/projects");
  }

  add(params) {
    return this.request("POST", "/todo/add", { params });
  }

  update(id, field, value) {
    return this.request("POST", "/todo/update", {
      params: { id, field, value: String(value) },
    });
  }

  delete(id) {
    return this.request("DELETE", `/todo/delete/${id}`);
  }
}
