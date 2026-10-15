# ChatGPT Sites Migration Plan — 2026-10-15

## Goal

Prepare Task Tracker for ChatGPT Sites hosting while removing the dependency on SQLite and `better-sqlite3`. Preserve existing task-management behavior and tests. Do not replace the current `main` branch or claim deployment success until the Site has been deployed and verified.

## Verified current repository facts

- Repository: `jaronhoh/Task-Tracker`
- Current app: CommonJS Node.js + Express in `app/server.js`
- Current database: `better-sqlite3`, created at `TASK_TRACKER_DB` or `app/data/task-tracker.sqlite`
- Root `package.json` starts the app with `node app/server.js`
- Existing test commands: `npm test` and `npm run test:ui`
- The current app has no built-in user authentication/role-based authorization. Do not publish broadly until access and authorization are reviewed.

## Target direction

Use the ChatGPT Sites-supported hosting runtime and its Cloudflare Worker-compatible build. Use **Cloudflare D1** through the logical `DB` binding for persistent relational data. Do not use SQLite files, `better-sqlite3`, a local disk database, or in-memory state for production persistence. Use R2 only if the application later needs durable uploaded files.

Official Sites documentation says Sites can host interactive sites/lightweight apps, can store app data and uploaded files, and that supported frameworks, databases, and hosting patterns depend on the Sites runtime. The OpenAI Sites showcase includes an example using a Worker-compatible ESM build and D1 binding named `DB`.

## Required implementation approach

1. Inspect the full existing application and tests before changing behavior. Inventory every API route, request/response shape, validation rule, status transition, ordering rule, ID generation rule, export feature, and UI interaction.
2. Keep the existing app intact on `main`; perform the migration on this branch.
3. Port the app to a Sites-compatible Worker/ESM application using the supported Sites starter/runtime. Do not assume the existing Express server can run unchanged.
4. Implement a small database/repository helper that accesses the D1 `DB` binding. Keep D1-specific calls out of UI components and route/business logic where practical.
5. Create versioned D1 SQL migrations for the current entities and indexes. Preserve the existing customer and task fields, task statuses, unique constraints, task ID sequence behavior, and any other constraints discovered during inspection.
6. Replace SQLite-specific SQL and APIs with D1-compatible SQL. Review transactions and concurrent writes carefully; do not assume SQLite-specific transaction behavior maps directly.
7. Preserve the current UI and functionality, including task creation/editing/autosave, customer handling, weekly/current-week status views, global search, sorting/pagination, edit time, deleted-task restore, and Excel export, subject to the actual existing code.
8. Keep timestamps and user-facing time behavior consistent with Malaysia Time (UTC+08:00), including the existing health/status information if still applicable.
9. Do not put secrets in source code. Use Sites secrets only for credentials that are genuinely needed.
10. Keep the Site private or restrict access while testing. The existing app has no built-in authentication, so a public URL must not be treated as protected merely because it is hosted by Sites.

## Validation gates

- Run lint/type checks/build that the chosen starter supports.
- Run all existing API and UI tests where compatible; adapt the test harness to the new runtime without silently removing test coverage.
- Add tests for D1 repository operations and migration setup.
- Verify create, read, update, status changes, deletion/restore, customer creation, search/filter/sort, pagination, time display, and Excel export.
- Verify data persists after reload and after a new deployment/version.
- Verify simultaneous updates do not silently overwrite each other.
- Test at desktop and mobile widths.
- Inspect the actual published Site URL and access controls. Record results and remaining limitations.

## Acceptance criteria

- Production code has no runtime dependency on `better-sqlite3` or a local SQLite file.
- All production data is stored persistently in D1 (or another explicitly approved Sites-supported persistent service).
- Existing user-visible Task Tracker workflows remain functional.
- Automated tests/build pass, or every remaining failure is explicitly documented.
- The Site is not reported as deployed until a real Site URL and post-deployment checks are confirmed.

## Official references

- Creating and using ChatGPT Sites: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- Sites developer learning guide: https://learn.chatgpt.com/docs/sites?surface=app
- OpenAI example showing Sites + Cloudflare Worker-compatible ESM + D1 binding: https://developers.openai.com/showcase/idea-intake
