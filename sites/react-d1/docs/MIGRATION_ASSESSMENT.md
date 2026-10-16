# Task Tracker → ChatGPT Sites migration assessment

Source: jaronhoh/Task-Tracker, migration/chatgpt-sites-d1, commit 440f9be516e11bcba487ae2e899e18cb5a3d15e7.

Inspected the migration plan, server implementation, all frontend HTML/CSS/JavaScript, both automated test files, package manifests, CI workflow and application documentation before implementation changes.

## Compatibility

Sites documents a Cloudflare Worker runtime, persistent D1 through a logical DB binding, and versioned SQL migrations applied at deployment. The existing Express process and better-sqlite3 file cannot run unchanged. Use the supplied Vinext starter with its Sites build integration, retain the static frontend, and route existing REST endpoints to a dedicated asynchronous D1 repository.

## Contract to retain

- GET health reports Malaysia Time; customer GET/POST, rename PATCH and color PATCH; task GET/POST, individual GET/PATCH/DELETE, and atomic time PATCH. Lists remain direct arrays and errors retain code/message envelopes.
- Eight task fields; five exact status strings; KIV default; title/customer maximum 100, description 255, note 1000. Customer names trim and match case-insensitively. Colors are unique and limited to the original 16 choices.
- IDs allocate before validation, permit gaps after failures, and never reuse allocated numbers. Customer auto-creation and task insertion must commit together. Rename must update all task references atomically.
- Active writes clear End. Terminal transitions generate Malaysia End unless explicitly supplied through Edit Time. Future Created prevents generated terminal End; End cannot precede Created. Logical deletion remains readable and restorable.
- Original dialogs, blur autosave with failed input retention, weekly Monday Malaysia boundaries and carry-over, status grouping, five-field contains search, all-data sorting and 25/50/100 pagination, current-result SheetJS export and filename rules.

## Concurrency and migration risks

D1 batch operations are atomic, but arbitrary asynchronous read/write transactions cannot be copied from better-sqlite3. Use atomic sequence allocation, database constraints, atomic batches for linked operations, and revision-guarded writes with explicit conflict responses/retry. A process-local promise queue cannot guarantee global HTTP receive order across multiple Workers. The original P0 receive-order guarantee needs a durable coordinator if strict distributed FIFO is mandatory; D1 can preserve atomicity and prevent silent lost writes, but alone does not define global network arrival order. Do not silently weaken that test.

No existing database file was supplied. Migrating application code does not transfer historical production data. A separate validated export/import procedure is needed before cutover, preserving sequence high-water mark and customer colors.

## Verification gates

Retain all existing API and UI assertions, adapting runtime/database harness only. Add D1 migration/repository and concurrent-write tests, disk-backed local runtime restart persistence, browser pagination/restore/customer/weekly/export-content checks at desktop/mobile widths. Verify build and owner-private access policy before any deployment. Hosted reload/redeployment persistence and anonymous access checks require a real restricted deployment and must be recorded separately from local results.

No Site has been deployed. Runtime capability documentation supports the proposed design; actual provisioning, build and tests remain to be verified.
