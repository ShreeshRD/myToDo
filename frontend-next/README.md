# myToDo — Web frontend

Next.js 16 / React 19 single-page app for myToDo: Upcoming, Today, Calendar, Search and Scratchpad views, task reminders, stopwatches and the optional "Ask AI" agent panel.

See [`../plan/project-overview.md`](../plan/project-overview.md) for how the whole project fits together.

## Run

```bash
npm install
npm run dev        # http://localhost:3001
```

The backend must be running (`../backend-springboot`, port 8000 in dev). Endpoints come from `.env.development` / `.env.production`:

| Variable | Dev | Prod |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000/todo` | `http://localhost:5555/todo` |
| `NEXT_PUBLIC_AGENT_URL` | `http://localhost:8080` | empty (agent panel hidden) |

## Build

`npm run build` produces a static export in `out/` and its `postbuild` step **replaces** `../backend-springboot/src/main/resources/static/` with it, so the Spring Boot jar serves the UI.

## Checks

```bash
npm run lint
npm test                 # unit tests + drag-logic script
npm run test:integration # everything, including integration tests
npm run typecheck
```

Conventions for contributors and agents live in [`AGENT.md`](AGENT.md).
