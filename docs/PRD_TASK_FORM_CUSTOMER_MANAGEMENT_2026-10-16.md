# PRD — Task Form & Customer Management Enhancements

**Date:** 2026-10-16 (MYT)  
**Status:** CR-005–CR-012 deployed by Sites Version 10 per project handoff; CR-013–CR-014 approved, implementation pending  
**Product:** Existing Task Tracker ChatGPT Sites React/D1 (not legacy Express)  
**Baseline:** Sites Version 10, as recorded in `docs/PROJECT_STATUS.md`

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

## 6. Follow-up change requests — 2026-10-16 (user confirmed)

### CR-009 — Bottom-right auto-dismiss notification using shadcn/ui Alert
**Scope:** User-facing transient success/error/information messages across Task Tracker, including task/customer create, update and delete flows.

- Replace existing transient message presentation with the visual semantics and styling of **shadcn/ui Alert (Base UI)**: https://ui.shadcn.com/docs/components/base/alert.
- Present these messages as **floating alerts fixed to the bottom-right of the viewport**, not as inline banners or modal dialogs.
- Each transient alert **automatically disappears after 5 seconds (5000 ms)** from appearance. Multiple messages must remain readable (stack without overlap) and clear their own timers.
- Support success, error and informational variants with readable message text; use accessible live-region announcements. Avoid stealing keyboard focus.
- Do not auto-dismiss confirmation dialogs, unsaved-data warnings or other interactions requiring user action; these are **not** transient notifications.
- Mobile: bottom-right placement remains visible within viewport with safe margins, no obstruction of critical controls.
- Note: shadcn/ui `Alert` is ordinarily an inline component; implement the explicitly requested floating position and timer using an appropriate React notification container/lifecycle while preserving the requested Alert visual style. Do not claim native Alert has built-in timed dismissal.

**AC-CR-009-01:** On success and failure actions, alert appears bottom-right with shadcn Alert visual design and disappears within ~5 seconds without interaction.
**AC-CR-009-02:** Two rapid alerts are individually readable and dismiss without timer leakage; mobile viewport and accessibility verified.
**AC-CR-009-03:** Destructive-action confirmation and blocking validation are not silently dismissed before the user can act.

### CR-010 — Add Customer within Manage Customers
**Scope:** Manage Customers dialog/page.

- Provide a clearly visible **Add Customer** action in Manage Customers, in addition to the existing delete/edit functionality.
- Allow entry of customer name and the existing customer color selection; reuse current validation, uniqueness rules and API behavior.
- On successful creation, update the Manage Customers list and customer selectors in New/Edit Task without page reload; show CR-009 success alert.
- On validation/API failure, preserve entered data and show actionable error; no duplicate or partial customer created.
- Do not remove or regress existing Add Customer entry points, if any.

**AC-CR-010-01:** Add customer from Manage Customers → new row visible and selectable in New/Edit Task.
**AC-CR-010-02:** Invalid/duplicate names follow existing validation rules, no accidental duplicates; notification behavior matches CR-009.

### CR-011 — Delete button inline with customer field
**Scope:** Manage Customers list layout.

- Place the **Delete** button **on the same horizontal row as its corresponding customer field/control** on desktop, aligned clearly with the customer being deleted.
- Preserve customer field usability, color swatch display and spacing; avoid wrapping Delete onto a separate row at normal desktop widths.
- On small mobile screens, maintain usability and prevent clipping/overlap; compact inline layout where feasible, responsive wrapping only when necessary.
- Keep the previously approved **server-side task-reference deletion guard**, confirmation dialog, and permissions unchanged.

**AC-CR-011-01:** Desktop screenshot shows each customer field and its Delete button on the same row.
**AC-CR-011-02:** Delete targets the correct customer; referenced customers remain protected; mobile controls do not overlap.

### Release and acceptance requirements for CR-009–CR-011
- Modify **existing Sites React/D1** application and source mirrored in `sites/react-d1/`; do not modify legacy Express.
- Test notifications (including timer cleanup), customer creation, row alignment, customer-delete safety, and task/customer regression.
- Perform **real browser** desktop/mobile interaction and visual acceptance; do not equate unit tests with actual UI acceptance.
- Preserve existing Site URL, project, D1 data, task/customer identifiers, sequence, revision, access policy and config, except user-authorized new customer data created during production use.
- Sync code and tests to GitHub, record distinct GitHub and Sites source commits, and update `docs/PROJECT_STATUS.md` with test, deploy and verification evidence.
- **Current state:** documentation approved/updated only; no claim of CR-009–CR-011 implementation or deployment.

## 7. CR-012 — Light Mode / Dark Mode toggle (2026-10-17)

**Status:** User-requested and approved requirement; **not implemented or deployed by this documentation change**.

### Functional behavior
- Add a theme toggle in the **top-right corner** of the Task Tracker application header, accessible on desktop and mobile.
- Use **Sun** and **Moon** icons (prefer existing icon library, e.g. lucide-react, if available).
- When Light Mode is active, show a Moon icon as the action to enable Dark Mode. When Dark Mode is active, show a Sun icon as the action to enable Light Mode. Provide clear accessible labels/tooltips (e.g. `Switch to dark mode`, `Switch to light mode`).
- Clicking toggles the application between Light and Dark **immediately without reload or navigation**.
- Persist the explicit user preference locally so refresh/revisit preserves it; when no explicit preference exists, initialize from the device's `prefers-color-scheme`. Do not write theme choice to D1 or modify task/customer data.
- The active theme must cover all application views and interactive surfaces: navigation tabs, cards, tables, accordions, New/Edit Task forms, Manage Customers, inputs, dropdowns, buttons, dialogs and CR-009 transient Alerts.
- Preserve meaningful existing customer color swatches/badges in both themes; ensure sufficient foreground/background contrast and visible focus indicators.
- Avoid initial light-theme flash on dark-theme preference when practical; avoid hydration mismatch and preserve keyboard accessibility.
- On narrow screens, keep the theme toggle visible in the header without overlapping title/navigation.

### Acceptance criteria
- **AC-CR-012-01:** Top-right toggle displays the correct Sun/Moon icon and accessible action label for the current theme.
- **AC-CR-012-02:** Toggle updates theme instantly, without losing search, filter, form data, or task selection.
- **AC-CR-012-03:** Refresh/reopen retains a manually chosen theme; first visit without preference follows OS theme.
- **AC-CR-012-04:** Real browser desktop (1440px) and mobile (390px) screenshots confirm legibility and correct colors in both modes across all key views, dropdowns, dialogs and alerts.
- **AC-CR-012-05:** Keyboard focus/activation works, icons have accessible labels, and customer color indicators remain recognizable.
- **AC-CR-012-06:** Automated UI tests and production regression tests pass; D1 rows, task/customer records, sequence, revision, URL, access policy and configuration unchanged.

### Delivery constraints
- Existing ChatGPT Sites React/D1 application only; GitHub source mirror `sites/react-d1/`; do not touch legacy Express/PocketBase.
- Use theme-aware CSS tokens/classes and components rather than isolated hard-coded black backgrounds.
- Verify the real browser before marking accepted. Record GitHub PR/merge, Sites source commit, deployment ID/version and before/after data checks in `docs/PROJECT_STATUS.md`.

## 8. Screenshot-driven UI changes — 2026-10-17

**Evidence:** User-provided screenshot of Dark Mode / Current Week Status, with annotated tab divider and accordion header area. **Requirements approved; code and deployment pending.**

### CR-013 — Remove full-width line beneath TabsList
- Remove the full-width horizontal gray divider/border spanning the page beneath `Weekly Task`, `Current Week Status` and `Show All Data`.
- Retain the short blue underline **only under the active tab**, as well as active text emphasis and keyboard focus indicator.
- Preserve existing tabs' navigation, accessibility, mobile horizontal scroll and business filtering behavior.
- Apply consistently in Light and Dark Mode; ensure no unintended border/shadow/pseudo-element recreates the full-width line.
- **AC-CR-013-01:** Desktop and mobile screenshots of each theme show no full-width tab divider, but active tab has a short blue underline.
- **AC-CR-013-02:** Clicking or keyboard-switching tabs continues to work with visible active/focus state.

### CR-014 — Customer task-count breakdown in every Accordion header
- Display a compact **Customer Name + Count** breakdown **within each Accordion header**, on the **same single horizontal header row** as its existing group title and total count, visible even while the Accordion is collapsed. Do not add a second row.
- Example display only (not actual production counts): `Work in Progress 17` with badges `JXM 10`, `MMM 1`, `VSTEC 6`.
- Calculate customer counts from the **exact task collection represented by that Accordion after existing search, weekly/status scope and applicable filters**. Count tasks, not distinct customers; never use hard-coded examples.
- The sum of customer badge counts **must equal** the existing Accordion task total for that group; if tasks have no resolvable customer, show a clear `Unassigned` bucket rather than dropping counts.
- Show only buckets with nonzero count; order deterministically (e.g. count descending, then customer name) to avoid jitter.
- Recompute on search, status/card filters, tab changes and data refresh. Respect existing accordion expansion/default rules, keyboard interactions, status grouping, pagination and export semantics.
- Use existing customer colors for badge dots/accents and ensure sufficient contrast in Light/Dark themes; do not alter stored customer colors.
- Keep header readable at desktop and mobile widths: the header must remain **one row with no badge wrapping**. Use compact spacing and a horizontally scrollable or clipped badge region with an accessible overflow affordance when the list is too long; never obscure the expand/collapse affordance or table columns.
- **AC-CR-014-01:** Each nonempty Accordion header shows all relevant customer-name/count badges without expanding it; their sum equals the group's total.
- **AC-CR-014-02:** Search/filter/tab changes update counts correctly; expanding/collapsing does not change counts or task rows.
- **AC-CR-014-03:** Desktop (1440px) and mobile (390px) screenshots verify a single-row header, controlled horizontal overflow of badges without wrapping, correct customer color and Dark/Light readability.
- **AC-CR-014-04:** Browser interaction, keyboard accessibility and existing weekly/status regression tests pass.

### Implementation and release constraints
- Modify **existing** ChatGPT Sites React/D1 only, with GitHub mirror under `sites/react-d1/`. Do not modify/deploy historical Express code.
- No D1 migration is needed for these display-only requirements; preserve existing Site URL, project, D1 rows, task/customer IDs, app sequence/revision, access settings and secrets.
- Run automated tests and real browser desktop/mobile acceptance, record screenshots and production read-only data comparisons. Update `docs/PROJECT_STATUS.md` with actual GitHub/Sites commits, version, deployment and acceptance evidence; do not claim PRD commit is a deployment.


## 9. Approved UI enhancements — 2026-10-18 (CR-015 / CR-016)

**Release status (2026-10-18):** User-approved CR-015/016 implemented, tested, self-reviewed, merged and deployed on the existing Sites project as **Version 12**. See [PROJECT_STATUS.md](PROJECT_STATUS.md) and [release evidence](evidence/cr015-cr016-v12/README.md) for exact GitHub/Sites SHAs, deployment, real Chromium acceptance and complete read-only production preservation checks. The requirements below remain the approved scope; the pre-release baseline was Version 11.

### CR-015 — Separator between customer name and task count in Accordion group headers
- In **every** existing customer/count summary badge within Weekly Task and Current Week Status group headers, display `Customer Name | Task Count`, e.g. `JXM | 10`, with visually comfortable spacing on both sides of the vertical separator.
- Retain each badge's existing customer color dot, real filtered counts, Unassigned bucket, ordering, single-line non-wrapping header, independent horizontal scrolling, collapsed visibility, group expand/collapse control, and keyboard behavior.
- Do not change group totals, task membership, filters, responsive layout, or any API/D1 data.
- **AC-CR-015-01:** All customer summary badges, including Unassigned where applicable, render a spaced `|` separator; actual group counts and badge totals remain identical to Version 11.
- **AC-CR-015-02:** Light/Dark desktop 1440px and mobile 390px screenshots confirm legible spacing without wrapping, clipping the toggle or breaking horizontal/keyboard scrolling; expanded and collapsed groups work.

### CR-016 — Searchable keyword filtering for existing data-selection dropdowns
- Every existing **data-option selection dropdown** supports an editable keyword input and live, client-side, case-insensitive **substring** matching (not prefix-only). Example: `SE` can match `VSTECS` and `User Testing` when those values exist. Do not hardcode example data.
- Apply to all existing New Task / Edit Task selectors (including Customer and Status), Manage Customers' color selectors and other existing data-selection dropdowns as applicable. Search existing color option textual HEX/RGB labels while preserving colored swatches and original stored values. Pure command/action menus are not required to become searchable unless they contain data choices.
- Filter options as typing occurs without a submit step; clearing search restores the complete list. Provide `No results found` when no option matches. Matching must not mutate saved selections until an option is chosen.
- Preserve initial selected values, placeholder, validation, form draft/state, create/edit/save behavior, customer creation refresh, original option order, theme, focus, keyboard interactions (Arrow keys/Enter/Escape), and usable touch/mobile interaction. Opening/closing the menu must not accidentally submit a form.
- Keep **existing** special actions such as `Add Customer`, `Manage Customers`, and `Add Data / New Task` visible and available as independently actionable footer/command controls, **outside the filtered option results**, including for zero matches. Do not invent actions in dropdowns that do not currently provide them. Existing actions keep their exact behavior and permissions.
- **AC-CR-016-01:** Search by interior substring with mixed case returns only matching data choices; clearing shows all; empty result displays clear feedback.
- **AC-CR-016-02:** Customer, Status and Color dropdowns (including selected color swatches/HEX-RGB labels) retain correct selection, save/reopen, validation and keyboard/touch operation; user-entered keyword alone does not save or alter data.
- **AC-CR-016-03:** Existing Add Customer / Manage Customers / Add Data actions stay present when filtering or showing no results, and still operate correctly; customer creation refreshes list without losing current unsaved task inputs.
- **AC-CR-016-04:** Real Chromium browser tests and screenshots at 1440px/390px in both Light/Dark themes; TypeScript, build, existing React/API/D1/weekly regressions and tab/group/filter/export behavior pass.

### Release and safety constraints
- Only the existing ChatGPT Sites React/D1 application, mirrored under `sites/react-d1/`; do not touch the legacy Express application or introduce PocketBase/PocketBay.
- No new D1 schema or mutation is required for the approved UI behavior. Preserve all production tasks/customers, IDs, app sequence/revision, owner-only access policy, existing Site URL, secrets and configuration.
- Work through implementation, regression tests, CI, review/merge and **separate** existing-Site deployment and native production browser verification. Record GitHub and Sites commits/versions independently and read-only compare all production D1 rows and access settings before/after. Do not label Version 12 deployed until Sites confirms it.
