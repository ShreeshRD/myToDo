import { createRequire } from "node:module";

import { agentNative } from "@agent-native/core/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const reactRouterPlugins = reactRouter as unknown as () => any[];
const agentNativePlugins = agentNative as unknown as (
  options?: Parameters<typeof agentNative>[0],
) => any[];
const appRequire = createRequire(import.meta.url);
const coreRequire = createRequire(
  appRequire.resolve("@agent-native/core/vite"),
);

export default defineConfig({
  server: {
    fs: {
      // The framework is a linked checkout at ../agent-native (outside the app
      // root). Its source, dist, and node_modules (incl. the assistant-ui
      // packages the aliases resolve into) must be readable by the dev server's
      // module runner; otherwise the nitro dev worker and framework modules
      // fail to load with ERR_LOAD_URL / 500.
      allow: ["../agent-native"],
    },
  },
  ssr: {
    // better-sqlite3 is a native addon; the framework only externalizes it in
    // build SSR. In dev, forcing it through the module runner breaks native
    // registration ("Module did not self-register"), which fails the DB
    // migration and 500s every page. Loading it as an external keeps one
    // host-side native instance.
    external: ["better-sqlite3"],
  },
  resolve: {
    // Core and toolkit both use assistant-ui contexts. Keep published and
    // linked graphs on one store so the agent sidebar can compose reliably.
    dedupe: [
      "@assistant-ui/react",
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
    ],
    alias: [
      {
        find: /^@assistant-ui\/react$/,
        replacement: coreRequire.resolve("@assistant-ui/react"),
      },
      {
        find: /^@assistant-ui\/core$/,
        replacement: coreRequire.resolve("@assistant-ui/core"),
      },
      {
        find: /^@assistant-ui\/store$/,
        replacement: coreRequire.resolve("@assistant-ui/store"),
      },
      {
        find: /^@assistant-ui\/tap$/,
        replacement: coreRequire.resolve("@assistant-ui/tap"),
      },
      {
        find: /^assistant-stream$/,
        replacement: coreRequire.resolve("assistant-stream"),
      },
      {
        find: /^assistant-stream\/utils$/,
        replacement: coreRequire.resolve("assistant-stream/utils"),
      },
    ],
  },
  plugins: [
    ...reactRouterPlugins(),
    ...agentNativePlugins({
      // shiki only runs in AssistantChat's useEffect — keep it out of the
      // CF Pages Functions bundle (25 MiB limit).
      ssrStubs: ["shiki"],
    }),
  ],
});
