export class ToolError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    this.extra = extra;
  }
}

export class ApiError extends Error {
  constructor(code, message, { status, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

export function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function fail(code, message, extra = {}) {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: code, message, ...extra }) }],
    isError: true,
  };
}
