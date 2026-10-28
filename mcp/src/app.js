import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { createMcpServer } from "./mcp.js";
import { todayInZone } from "./dates.js";

const allowedOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function createApp({ api, clock = () => new Date(), config }) {
  const app = createMcpExpressApp({ host: config.host });

  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || allowedOrigin.test(origin));
      },
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Accept",
        "Mcp-Session-Id",
        "MCP-Protocol-Version",
        "Last-Event-ID",
      ],
      exposedHeaders: ["Mcp-Session-Id"],
    })
  );

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      api: config.apiUrl,
      today: todayInZone(clock(), config.timeZone),
    });
  });

  app.get(config.path, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Method not allowed." },
      id: null,
    });
  });

  app.delete(config.path, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Method not allowed." },
      id: null,
    });
  });

  app.post(config.path, async (req, res) => {
    const server = createMcpServer({ api, clock, config });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[todo-mcp] request failed", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  return app;
}
