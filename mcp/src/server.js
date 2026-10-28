import { loadConfig } from "./config.js";
import { TodoApi } from "./api.js";
import { createApp } from "./app.js";

const config = loadConfig();
const api = new TodoApi({ baseUrl: config.apiUrl, timeoutMs: config.apiTimeoutMs });
const app = createApp({ api, clock: () => new Date(), config });
app.listen(config.port, config.host, () => {
  console.error(
    `[todo-mcp] listening on http://${config.host}:${config.port}${config.path}`
  );
});
