# Task Tracker

## Current application — ChatGPT Sites (React + D1)

**Production:** [Task Tracker](https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/) · existing owner-only Sites project. **Latest release verified in repository records:** Sites **Version 15** (2026-10-19). The GitHub repository is currently **Public**, which is a separate access policy from the Site. Do not publish real task/customer/log data or credentials to this repository.

**Current source of truth:** `sites/react-d1/` (React 19 + TypeScript + shadcn-style UI/Tailwind + Vinext/Workers routes + production Cloudflare D1 `DB` binding). The original standalone HTML/Express/SQLite design documented further below is **legacy project history, not the current production deployment**.

Core workspaces: Task Tracker (Weekly Task, Current Week Status, Show All Data, customer/task editing and Excel export) and Log Time (Today/This Week/Show All Data, searchable dated work entries, linked or one-off custom tasks, time validation, date Accordion and linked Time Spent). Existing Log Time ordinary edits Auto Save; changes to Date/Start/End use explicit Save Time.

**Changes not yet released:** [Draft PR #20](https://github.com/jaronhoh/Task-Tracker/pull/20) contains CR-022 (current-week Deleted card), CR-023 (12-hour AM/PM pickers), reliability/hardening and newly approved **CR-024** (no public/third-party API service, protected internal APIs only). **CR-024 request-integrity guards are implemented in Draft PR #20 and tested locally, but Owner authentication and production Sites exposure are NOT VERIFIED**; see [Issue #24](https://github.com/jaronhoh/Task-Tracker/issues/24). No draft feature is production-live solely because it was committed or passed CI. Read `docs/PROJECT_STATUS.md` and `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md` §§10–11.

### API access policy — CR-024 (approved requirement, pending verification)

Task Tracker is a single-owner Sites application; **it does not offer a public or third-party API service**. Existing same-origin browser-to-D1 HTTP routes (e.g., `/api/tasks`, `/api/customers`, `/api/log-time` and `/api/health`) must remain available **only to authorized Site Owner requests**. They are **not to be deleted indiscriminately** or exposed to anonymous callers. Native Owner-only protection of every API path requires real Sites verification; a relative URL, CORS setting or client-supplied header is **not** itself authorization. Server request guards now reject explicit cross-site Fetch Metadata, mismatched Origin and non-JSON POST/PATCH in local tests. **These are not identity checks**: native Sites Owner-only protection of each route, anonymous/non-Owner denial and real production backup are still pending. Historical REST API sections below are preserved only as archived project context, not an active public API offering.

### Development and validation

```bash
cd sites/react-d1
npm ci --no-audit --no-fund
node node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit
npm run test:react
npm test
npm run build
# Browser QA requires Playwright Chromium:
npx playwright install chromium
node --test test/react-ui.test.cjs test/log-time-ui.test.cjs
```

Use isolated D1 test fixtures for all write-path QA. After code review and green CI, update the **existing** Sites project through authorized native Sites publishing. A GitHub merge or a successful build is not a deployment. Read `docs/operations/RELEASE_AND_RECOVERY.md` for preservation, owner-only, D1 snapshot, rollback and restore-check guidelines. Do not run destructive migrations or reset production task IDs.

---

## Archived Phase 1 product/design notes (historical only)

The following original planning material is preserved for traceability; where it differs from the current React/D1 implementation or later PRD changes, **the current code and latest approved PRD take precedence**.


A simple task management and weekly reporting web application designed around a Microsoft Lists / Power Apps-style table experience.

## Overview

**Task Tracker** is a Phase 1 product designed to make daily task tracking and weekly reporting simple and lightweight.

The planned application uses:

- **Single Page HTML + JavaScript** frontend
- **SQLite** database
- **DataTables** for the main task listing
- **REST API** for Task CRUD
- **Excel Export** for the current view
- **Malaysia Time (UTC+8)** for task timestamps and weekly boundaries

The product focuses on a large, practical task table rather than a complex project-management system.

## Phase 1

### Main Views

| View | Purpose |
|---|---|
| **Weekly Task** | Show Carry Over and New This Week tasks |
| **Current Week Status** | Show current-week tasks grouped by status |
| **Show All Data** | Show the complete task history, including Deleted records |

### Task Status

- Work in Progress
- Pending with Customer
- KIV
- Closed
- Deleted

Deleted is a logical status. Records remain in SQLite and can be restored by changing the Status.

### Task Fields

- Task ID
- Customer Name
- Task Title
- Task Description
- Note
- Created
- End
- Status

Task IDs use the format:

`TSK-0001`, `TSK-0002`, ...

Task IDs are permanent, unique, and are never reused.

## Customer Management

Customers are maintained directly within the application.

- Customer Name is selected from a dropdown.
- New customers can be added directly from the dropdown.
- Customers use one of **16 predefined colors**.
- Each customer must have a unique color.
- Customers can be renamed or have their color changed.
- Customers cannot be deleted.
- Historical tasks reflect the latest customer name and color.
- If all 16 colors are already used, another customer cannot be created.

## Weekly Rules

The weekly boundary is based on **Malaysia Time (UTC+8)**:

**Monday 00:00:00 inclusive → following Monday 00:00:00 exclusive**

### Carry Over

A task is a Carry Over task when:

- Created Week is earlier than the Current Week
- Status is not Closed
- Status is not Deleted

Unfinished tasks carry over indefinitely until they are Closed or Deleted.

### New This Week

A task is New This Week when:

- Created Week equals the Current Week
- Status is not Deleted

Current-week Closed tasks remain visible in New This Week.

## Search

Each view provides Global Search across:

- Task ID
- Customer Name
- Task Title
- Task Description
- Note

Search is contains-based and case-insensitive.

Status, Created and End are not searched.

## REST API

Phase 1 includes Task CRUD endpoints:

```
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/{taskId}
PATCH  /api/tasks/{taskId}
DELETE /api/tasks/{taskId}
```

API Status values use the same full text values as the Web App.

API Customer values use Customer Name. If a Customer does not exist, the API can automatically create the Customer using the first unused predefined color.

DELETE performs a **logical delete** rather than physically removing the database record.

## Excel Export

Each view supports Excel export of the current displayed result.

Filename format:

```
TaskTracker_[ViewName]_YYYYMMDD.xlsx
```

Each export contains one Excel file with one sheet.

## Product Definition

The product definition is maintained under:

```
01-产品定义/
├── 01-基本描述.md
├── 02-JTBD场景.md
├── 03-范围边界.md
├── 04-页面流程.md
├── 05-开放问题.md
└── 06-最终定型稿.md
```

These documents represent the Phase 1 PM Make product definition and final product direction.

## Scope Boundary

Phase 1 intentionally does **not** include:

- Phase 2 features
- Physical deletion
- Bulk Update / Delete
- Row-selection checkboxes
- Action Column
- Complex permission management
- Separate Customer Management page

## Status

**Phase 1 Product Definition — Finalized; application implementation in progress**

N01–N120 product questions have been resolved, with no remaining open product-definition questions.

---

*Task Tracker — Phase 1*


## Application Implementation

The initial runnable application slice is under [`app/`](app/):

- Express REST API and SQLite persistence
- Task CRUD, logical delete, Malaysia Time (UTC+8), Task ID sequence that permits gaps but never reuses allocated IDs
- Customer creation, rename, unique 16-color assignment and linked Task name updates
- Single-page task table with Weekly Task, Current Week Status, Show All Data, global search, dialogs, Edit Time and Excel export
- API tests under `app/test/` and a GitHub Actions workflow under `.github/workflows/`

### Run locally

```bash
cd app
npm install
npm start
```

Open `http://localhost:3000`. To run the API test suite, use `npm test` from `app/`. Automated API coverage and a Playwright browser acceptance suite are maintained separately. The latest successful GitHub Actions run [38726212709](https://github.com/jaronhoh/Task-Tracker/actions/runs/38726212709) passed 31 API tests and 1 browser acceptance test. Automated tests do not replace the 16 manual P0 scenarios, concurrency/fault-injection evidence, or deployment acceptance.


## Run from repository root

The repository root now contains a Node.js entry point for hosting platforms such as PocketBay:

```bash
npm install
npm start
```

The web server binds to `0.0.0.0` and uses the hosting platform's `PORT` environment variable (default `3000`). The application health endpoint is `/api/health`. The SQLite database is created at `app/data/task-tracker.sqlite`; confirm the hosting platform provides persistent storage before relying on hosted data across redeployments.

For the API test suite from the repository root:

```bash
npm test
```

For the browser acceptance test, install Chromium once and run:

```bash
npx playwright install chromium
npm run test:ui
```


## PocketBay deployment readiness

See the repository's [PocketBay deployment checklist](POCKETBAY_DEPLOYMENT.md) for runtime settings, persistent-storage requirements, access control, smoke tests, and recovery. Follow the official [PocketBay deployment guide](https://pocketbay.com/deploy). This repository is prepared as a Node.js web app from the repository root:

- Start command: `npm start`
- Runtime port: `PORT` (defaults to `3000`)
- Bind address: `0.0.0.0`
- Health endpoint: `/api/health`
- SQLite path override: `TASK_TRACKER_DB`

**Before accepting real data**, configure `TASK_TRACKER_DB` to a PocketBay persistent-storage location confirmed in the deployment console, then create a test Task and verify it survives an app restart/redeploy. Do not assume the default `app/data/task-tracker.sqlite` path is persistent unless PocketBay confirms that path is mounted persistently.

Task Tracker does not implement in-app user authentication or role-based access. Keep the PocketBay app private or password-protected unless and until an explicit public-access decision is made. Do not publish real customer/task information to an unrestricted URL.
