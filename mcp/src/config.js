export function loadConfig(env = process.env) {
  const config = {
    host: env.TODO_MCP_HOST ?? "127.0.0.1",
    port: Number(env.TODO_MCP_PORT ?? 8765),
    path: env.TODO_MCP_PATH ?? "/mcp",
    apiUrl: env.TODO_API_URL ?? "http://127.0.0.1:8000",
    apiTimeoutMs: Number(env.TODO_API_TIMEOUT_MS ?? 5000),
    timeZone: env.TODO_TIMEZONE ?? "Asia/Kolkata",
    maxTasks: Number(env.TODO_MAX_TASKS ?? 50),
  };

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`TODO_MCP_PORT must be an integer 1-65535, got ${config.port}`);
  }
  if (!Number.isInteger(config.apiTimeoutMs) || config.apiTimeoutMs <= 0) {
    throw new Error(`TODO_API_TIMEOUT_MS must be a positive integer, got ${config.apiTimeoutMs}`);
  }
  if (!Number.isInteger(config.maxTasks) || config.maxTasks < 1 || config.maxTasks > 200) {
    throw new Error(`TODO_MAX_TASKS must be an integer 1-200, got ${config.maxTasks}`);
  }
  if (!config.path.startsWith("/")) {
    throw new Error(`TODO_MCP_PATH must start with "/", got ${config.path}`);
  }
  try {
    new URL(config.apiUrl);
  } catch {
    throw new Error(`TODO_API_URL must be a valid URL, got ${config.apiUrl}`);
  }

  return config;
}
