# PRD — Task Form & Customer Management Enhancements

**Date:** 2026-10-16 (MYT)  
**Status:** Requirements confirmed by user; implementation / testing / Sites deployment pending  
**Product:** Existing Task Tracker ChatGPT Sites React/D1 (not legacy Express)  
**Baseline:** Sites Version 7, as recorded in `docs/PROJECT_STATUS.md`

## 1. Objective
Improve New Task and Edit Task workflows, allow safe customer removal, and make customer colors visually identifiable.

## 2. Confirmed change requests

### CR-005 — Tracker Link in New Task and Edit Task
**Scope:** Both **New Task** and **Edit Task** forms, plus the Task Table.

- Add optional field labeled exactly **Tracker Link** to both forms.
- Persist the link on task creation and update; when reopening Edit Task, populate the saved value.
- In Task Table, show a clickable link icon for tasks with a Tracker Link; opening it uses a new tab/window with safe external-link attributes. Tasks without a link do not display an active link.
- Validate URL format for user-entered links (HTTP/HTTPS only); blank is permitted. Prevent unsafe URL schemes.
- Include Tracker Link in task read/write APIs and D1 persistence. Any required migration must be additive, preserve existing records and be reviewed before production deployment.
- Do not alter task ID allocation, existing task data, weekly calculations or task status behavior.

**Acceptance:** Create task with link → icon opens correct URL; edit link → icon points to updated URL; remove link → icon disappears; old tasks without link remain valid; malformed/unsafe URL rejected; new tab does not expose opener.

### CR-006 — Status / Created / End on one row in New Task and Edit Task
**Scope:** Both **New Task** and **Edit Task** forms.

- Arrange **Status**, **Created**, and **End** in the **same horizontal row** on desktop, with readable labels and values.
- Preserve each field's existing input type, validation, default value, timezone and business logic.
- On narrow/mobile screens, responsive stacking/wrapping is allowed to avoid overlap; no clipping or horizontal overflow.
- Verify both create and edit workflows, including populated values and error states.

**Acceptance:** All three fields appear in one row in both forms at desktop viewport; on mobile they remain usable and legible; saved values unchanged.

### CR-007 — Safe customer deletion in Manage Customers
**Scope:** Existing Manage Customers interface, customer API and D1 data integrity.

- Retain existing **Add Customer** behavior; introduce a **Delete** action for each customer.
- **Confirmed rule Q2=A:** if a customer is referenced by **any existing task**, deletion is **blocked**, and UI explains the reason and number of linked tasks.
- For a customer with **zero** linked tasks, show a confirmation dialog; delete only after confirmation.
- Enforce the reference check **server-side within the deletion transaction** to prevent bypass/race conditions; UI checks alone are insufficient.
- Do not cascade-delete tasks or null out their customer fields.
- Keep customer list, color dropdowns and task forms in sync after successful deletion.
- If customer is in use, provide a non-destructive explanation; do not auto-reassign tasks.

**Acceptance:** Unused customer can be deleted after confirmation; cancel leaves it unchanged; used customer cannot be deleted through UI or API; all task records and references remain intact.

### CR-008 — Customer Color dropdown with visible swatches
**Scope:** Customer color selection in Manage Customers and any existing customer-color dropdown controls.

- Show a **visible color swatch** beside the existing RGB/HEX code for each option, not code-only text.
- Selected value also shows its color swatch and readable code; maintain accurate color-to-code mapping.
- Provide accessible text labels and sufficient focus indication; swatch must not be the only identifying signal.
- Retain current color options, stored color values and selection behavior unless separately approved.
- Ensure swatches work in dropdown options and selected display, including on mobile.

**Acceptance:** Each option and selected value visibly display the correct color + code; selecting a color persists existing expected value; keyboard and mobile selection work.

## 3. Dependencies and constraints
- **Sites only:** update existing ChatGPT Sites React/D1 app; do not modify or deploy legacy `app/` Express, PocketBase/PocketBay, or create a replacement Site.
- Preserve production tasks, customers, sequence, revision, project ID, URL, access policy and secrets.
- CR-005 requires a new optional persisted field and possibly an additive D1 migration; **take a read-only snapshot and prepare rollback**. Do not run destructive migrations.
- CR-007 introduces a delete endpoint/action. Require appropriate existing authorization and backend referential integrity.
- Do not silently alter current export fields or behavior; if Tracker Link must be exported, document as a separate decision.

## 4. Release acceptance and evidence
1. Real-browser desktop/mobile screenshots of **both** New Task and Edit Task, showing the one-row Status/Created/End layout.
2. Real-browser create/edit/reopen and table-link click tests for Tracker Link; invalid and empty values covered.
3. Real-browser used/unused customer deletion and cancel tests, plus backend authorization/reference checks.
4. Color dropdown screenshot showing colored options and selected color, with keyboard tests.
5. Automated React, API, D1/migration, and regression tests; TypeScript/build checks.
6. Production data and configuration comparison before/after; ensure existing tasks/customers/sequence/revision preserved **except explicitly authorized new/deleted test data**. Prefer test/staging environment for mutation tests.
7. Deploy **existing** Site only after tests and safety checks; record actual Sites source commit, deployment version/ID, screenshots and browser acceptance.
8. Sync verifiable Sites React source to GitHub separately if supported; update `docs/PROJECT_STATUS.md` with actual results, distinguishing GitHub/Sites/browser/user evidence.

## 5. Open design details (non-blocking unless implementation reveals a conflict)
- Task Table link-icon placement should follow the existing table design without displacing key columns.
- Export inclusion of Tracker Link is **not** approved; preserve existing export semantics.
- Customer deletion counts all existing task references, including closed/older tasks; confirm exact treatment of soft-deleted task records from the existing schema before implementation, favoring data safety.
