# Task Tracker for ChatGPT Sites

Migration source: `jaronhoh/Task-Tracker` branch `migration/chatgpt-sites-d1`, commit `440f9be516e11bcba487ae2e899e18cb5a3d15e7`.

The original HTML/CSS/JavaScript interface is retained. Vinext routes serve the original REST API on Cloudflare Workers. All production records live in D1 through `DB`. Production has no dependency on Express, better-sqlite3, local database files, browser storage, or mock records.

## Structure

- `public/`: original frontend and bundled browser dependencies.
- `lib/rules.mjs`: preserved validators, status/time rules and resource shape.
- `lib/service.mjs`: task/customer business operations.
- `db/repository.mjs`: D1 snapshots, atomic mutation batches and optimistic revision checks.
- `db/schema.ts`, `drizzle/`: versioned schema, generated SQL and Drizzle metadata.
- `test/`: adapted original API/UI assertions and added D1/persistence/browser coverage.

## Development

Use Node >=22.13, install with `npm ci --legacy-peer-deps`, then run `npm run build`. The prebuild script copies pinned package assets into `public/vendor`; there are no runtime CDN dependencies. Run `npm test`, install Chromium with `npx playwright install chromium`, and run `npm run test:ui`. Tests use actual local D1 via Miniflare. Browser scenario databases are ephemeral test fixtures; the separate disk-backed test verifies runtime restart persistence. Neither is a production storage fallback.

Generate new schema migrations with `npm run db:generate`. Never edit applied migration history. Apply pending local SQL using the documented Sites Wrangler command against `.wrangler/state`; deployment applies hosted migrations separately. Do not run fault-injection tests against a hosted or real-data database.

The build emits the Worker, assets, DB binding and migration metadata. Use the Sites workflow for packaging and deployment. Preserve the existing project ID and owner-private access policy. No application-specific sharing or membership system is added; the hosting access boundary protects this single-owner tracker.

## Transactions and ordering

Every mutation reads a consistent D1 batch snapshot, validates a private copy, then commits a diff in one atomic batch guarded by a global revision/token. Conflicting snapshots rerun validation against current data, preventing lost independent-field updates, customer uniqueness races and partial renames. ID allocation is a separate committed operation, preserving permanent gaps on failed creation. Database errors roll back the entire batch.

The original per-task receive-order queue is retained within each Worker isolate. D1 revision checks protect concurrent isolates from lost updates. A universal network-arrival order across separate Workers is not defined by Sites/D1; strict distributed FIFO would require a durable admission queue/coordinator. The current supported hosting declaration exposes D1/R2 but no Durable Object binding. A compatible extension is a D1 command table with atomically allocated per-task tickets and ordered replay; its admission order would need to be accepted as the ordering definition before implementation.

The repository reads full task/customer snapshots, consistent with the existing API loading all records. Very large histories need bounded queries and a revised server-side pagination contract; load testing at production volume remains outstanding.

## Existing data and cutover

No production database or data export was provided or accessed. Existing historical records are not automatically imported. Before real-data cutover: take a read-only export of customers, tasks and sequence; validate field lengths, status values, Malaysia offsets, normalized names, color uniqueness and references; import through a separate controlled D1 operation; set the sequence at least to both the original sequence and one greater than the largest allocated suffix; compare row counts and every resource; keep the old app read-only until persistence/access checks pass. Retain a backup and rollback route. Do not put datasets in schema migrations.

## Validation evidence

- Sites build and TypeScript check: passed.
- Original 44 API scenarios on D1 plus 2 added D1 concurrency/restart scenarios: 46 passed.
- Original 3 Playwright acceptance scenarios: passed.
- Added browser scenario: passed against both the test HTTP harness and the built Worker, covering pagination, restore, customer rename/color, weekly carry-over, generated Excel contents, reload and mobile dialog width. Browser timezone deliberately differs from Malaysia.
- Built Worker health: HTTP 200 and Malaysia timezone metadata.
- Native download event/filename and generated XLSX workbook contents are verified. Windows sandbox cancels OS file saving, so successful physical download completion is not asserted in this environment.
- Site access configuration: custom owner-only policy, no groups/external viewers, verified before deployment.

Local results do not prove hosted persistence, hosted anonymous rejection, or historical-data import. Record those separately following any restricted deployment.
