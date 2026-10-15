# Task Tracker — Application

This folder contains the first runnable implementation slice for Phase 1.

## Stack

- Node.js 20+
- Express REST API
- SQLite via `better-sqlite3`
- Single-page HTML/JavaScript frontend
- DataTables for task table interaction
- SheetJS for current-view Excel export

## Run locally

From this directory:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The default database is created at `app/data/task-tracker.sqlite`. Set `TASK_TRACKER_DB` to override the path. Do not point test runs or fault-injection tests at production data.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health and time-zone metadata |
| GET | `/api/tasks` | Direct JSON array of Task resources |
| POST | `/api/tasks` | Create Task; auto-create Customer if needed |
| GET | `/api/tasks/:taskId` | Read one Task, including Deleted |
| PATCH | `/api/tasks/:taskId` | Update editable Task fields |
| PATCH | `/api/tasks/:taskId/time` | Atomic Edit Time flow for the UI |
| DELETE | `/api/tasks/:taskId` | Logical delete |
| GET | `/api/customers` | List Customers |
| POST | `/api/customers` | Create Customer |
| PATCH | `/api/customers/:customerName` | Rename Customer and update Task references atomically |
| PATCH | `/api/customers/:customerName/color` | Change Customer color to an unused predefined color |

## Test

```bash
npm install
npm test
```

Tests use an in-memory SQLite database. They are authored but must be executed in a Node.js environment before any test is marked Pass.

## Implementation notes

- Task ID allocation is committed separately from Task creation, so failed creates may leave gaps but allocated IDs are not reused.
- Customer names are matched after trimming leading/trailing spaces and ignoring case.
- Customer creation/rename and related Task writes use SQLite transactions.
- Malaysia timestamps are stored with an explicit `+08:00` offset.
- Deleted Tasks are logical deletes and remain readable.
- The UI uses CDN-hosted DataTables and SheetJS assets, so those assets require network access in the browser.
- This is the initial implementation slice. See the Phase 1 PRD and P0 test documents for the complete acceptance baseline and remaining verification work.
