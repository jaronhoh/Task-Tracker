# Task Tracker

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

**Monday 00:00:00 → Friday 23:59:59**

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

**Phase 1 Product Definition — Finalized; initial application implementation started**

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

Open `http://localhost:3000`. To run the API test suite, use `npm test` from `app/`. The tests have been authored but should only be considered passed after a real execution result is available. This is the first implementation increment; remaining PRD acceptance criteria and UI/API edge cases still require implementation and verification.
