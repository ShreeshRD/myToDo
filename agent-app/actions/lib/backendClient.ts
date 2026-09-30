/**
 * Shared HTTP client for Agent-Native actions to communicate with the Spring Boot backend.
 *
 * Ports (per root DOX):
 *   - Development: http://localhost:8000
 *   - Production:  http://localhost:5555
 *
 * Auth: Reads the `auth_token` from agent context environment variable
 * (BACKEND_AUTH_TOKEN) or from a forwarded Authorization header on the action request.
 */

const BACKEND_BASE_URL =
  process.env.NODE_ENV === "production"
    ? (process.env.BACKEND_URL ?? "http://localhost:5555")
    : (process.env.BACKEND_URL ?? "http://localhost:8000");

export interface BackendRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  body?: unknown;
  /**
   * Sent as URL query parameters. The Spring Boot /todo/add and /todo/update
   * endpoints bind @RequestParam, which never reads a JSON body.
   */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Sent verbatim as text/plain (e.g. scratchpad content, stored as the raw body). */
  rawBody?: string;
  /** JWT or session token forwarded from the agent actor session. */
  authToken?: string;
}

export interface BackendResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Call the Spring Boot backend REST API.
 * Throws on network failure; returns a typed response for HTTP-level errors.
 */
export async function callBackend<T = unknown>(
  opts: BackendRequestOptions,
): Promise<BackendResponse<T>> {
  const { method = "GET", path, body, query, rawBody, authToken } = opts;

  const headers: Record<string, string> = {
    "Content-Type": rawBody !== undefined ? "text/plain" : "application/json",
    Accept: "application/json",
  };

  const token = authToken ?? process.env.BACKEND_AUTH_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const qs = params.toString();
  const url = `${BACKEND_BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    method,
    headers,
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let data: T;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = (await response.json()) as T;
  } else {
    data = (await response.text()) as unknown as T;
  }

  return { ok: response.ok, status: response.status, data };
}
