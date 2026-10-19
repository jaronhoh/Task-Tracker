# PRD — Phase 2: Log Time

**Date:** 2026-10-19 (MYT)  
**Product:** Existing Task Tracker ChatGPT Sites React + D1  
**Baseline:** Production Sites Version 12, as recorded in `docs/PROJECT_STATUS.md`  
**Requirement source:** User-confirmed Phase 2 conversations through 2026-10-19  
**Status:** User-approved functional scope; documentation only until implementation, tests, merge, Sites deployment and production verification each succeed  
**Target:** Existing Site project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, not a replacement Site

## 1. Objective and scope

Add an independent **Log Time** workspace for dated time entries while keeping all existing Task Tracker capabilities. Log Time shares the existing Customer master. A time entry may link to an existing eligible Task Tracker task or contain a **one-off Custom Task**; only linked entries contribute to that Task Tracker task's displayed **Time Spent**.

**In scope:** Two top-level workspace tabs; Log Time Today / This Week / Show All Data views; summary cards; date-grouped table; New/Edit/Delete dialogs; keyword-searchable Task Title/Customer/Activity controls; editable copied task details; time and overlap validation; safe persisted Log Time CRUD; Task Tracker aggregate Time Spent; compatibility, browser testing, and existing Site deployment.

**Out of scope:** A separate Customer master; creating a Task Tracker task from Log Time; a reusable Custom Task catalog; automatic mutation of a Task Tracker task's description/note/tracker link/status from Log Time; overnight multi-date entries; future work-date entries; deployment of abandoned legacy Express/PocketBase app.

## 2. Module plan and dependencies

| ID | Module | Main responsibility | Depends on |
| --- | --- | --- | --- |
| F01 | Workspace navigation | Top-level Task Tracker / Log Time tabs, preserve original Task Tracker | existing React layout |
| F02 | Log Time data & APIs | Additive D1 persistence, CRUD, validation, association integrity | existing task/customer APIs, D1 |
| F03 | New/Edit Log Time | Popup dialog, searchable fields, copy-on-select, Custom Task | F02 and existing searchable selectors |
| F04 | Task association & Time Spent | Aggregate/recompute linked time into Task Tracker view | F02 |
| F05 | Log Time views & dashboard | Date accordions, Today/This Week/All, table, summary cards | F02 |
| F06 | Cross-cutting QA and release | Automated/browser acceptance, safe additive migration, existing Site publish | F01–F05 |

**Recommended order:** F02 → F03/F04 (parallel once API contract is agreed) → F01/F05 → F06. Keep UI, API, D1 and deployment evidence separately verifiable.

## 3. Existing architecture facts and preserved behavior

- Current GitHub `sites/react-d1/db/schema.ts` has task fields `task_id`, `customer_name`, `task_title`, `task_description`, `note`, `tracker_link`, `status`, `created`, `end`; Customer key is `name`. Reuse these actual mappings, **not** a speculative `discussion` column.
- Existing `sites/react-d1/lib/rules.mjs` enumerates `Work in Progress`, `Pending with Customer`, `KIV`, `Closed`, `Deleted`. The user's shortened “Pending” means existing **Pending with Customer**. Never silently change status constants.
- Only `Work in Progress`, `Pending with Customer`, `KIV` are eligible in the **new-log/choose-new-task** selector. `Closed` and `Deleted` are not selectable for new associations. Existing linked logs remain editable/deletable after a task is Closed, retaining their task identity for history.
- Existing Task Tracker UI, task status, time controls, task IDs/sequence, task/customer rows, colors, filters, weekly rules, exports, owner-only access, API business logic and prior CR-001–CR-016 behavior stay intact except the approved Time Spent presentation and required safe reference guards.
- Use existing Sites `DB` D1 binding and additive versioned migrations; no reset/seed/reimport or modification to already-applied migration history.

## 4. Functional requirements

### F01 — Workspace navigation

- Add a new **top-most** two-tab navigation `Task Tracker | Log Time`. The existing Task Tracker retains its current view tabs and behavior within its own workspace.
- Match Version 12 typography, components, responsive design, customer colors, modal/alert behavior, accessible keyboard focus and Light/Dark theme. Preserve existing preferences.
- **AC-F01-01:** Switching workspace tabs does not unexpectedly alter saved tasks or log data; desktop/mobile/light/dark and keyboard interaction work.
- **AC-F01-02:** All previously existing Task Tracker actions remain usable.

### F02 — Log Time record model, persistence and validation

Each Log Time row has its **own immutable identifier** (not a Task Tracker task ID), with:
 
| Field | Type / rule |
| --- | --- |
| Customer Name | Required; same existing Customer master, stored association; from linked task auto-populate and lock; Custom Task user-selectable |
| Task Title | Required; linked Task Tracker task title OR one-off Custom Task title |
| Task Description / Comment | Editable optional long text; initially copied from linked `task_description` |
| Note | Editable optional text; initially copied from linked `note` |
| Tracker Link | Editable optional HTTP(S) URL; initially copied from linked `tracker_link` |
| Activity | Choice from the exact eleven options defined in F03 |
| Date | Required Malaysia work date `YYYY-MM-DD`, default today; today or past only, no future date |
| Start Time | Required 24-hour local time `HH:mm` |
| End Time | Required 24-hour local time `HH:mm`, **strictly later** than Start Time on the same Date |
| Spend Time (Hour) | Read-only, derived from End minus Start; display decimal hours (e.g. 09:00–10:30 = 1.50) |
| Task link | Nullable stable `task_id`; set only for an actual Task Tracker task; null for Custom Task |
| Record metadata | Preserve created/updated timestamps and any revision/integrity tracking required for safe concurrent updates |

**Rules:**
1. Each row belongs to exactly one Date; **overnight logging is forbidden**. For overnight work, users record two separate dates.
2. No overlapping intervals on the **same Date**, across all subjects and customers, for this single-owner Log Time. Adjacent intervals where one ends exactly when the next starts are allowed. Validate both on add and edit (excluding the edited row itself); enforce at the **server/D1 transactional boundary**, not UI-only, including concurrent writes.
3. Users may backfill past Dates or record for today; **future Dates are invalid**. Do not silently impose an unapproved extra ban on future clock times within today.
4. Save rejects invalid/missing Customer, Subject, Activity, start/end/date or unsafe URL as appropriate; preserve dialog draft and show informative validation.
5. Customer must refer to the shared Customer master. Prevent referential damage when deleting/renaming customers also used by Log Time; follow/extend existing server-side transactional safety guards.
6. Store durations in precise minutes/integer seconds (implementation choice; avoid cumulative floating-point drift); display hours to 2 decimals. Recalculate from persisted intervals, do not trust client-submitted hours.
7. Log Time edits may alter the linked task, including changing from Task A to Task B, or to Custom Task. Keep the Log Time record ID unchanged. Revalidate eligibility for any **newly selected** task; retained historical Closed-task links remain editable without being treated as new association.
8. On deletion, remove only the selected Log Time row and recalculate projections; no Task Tracker task deletion or Customer deletion is implied.
9. **Data integrity decision for engineering review:** Task deletion/soft-deletion/customer rename interactions with existing linked Log Time must preserve historical logs and avoid orphaning/silent cascade. Stop for user clarification before introducing an irreversible change to current task deletion semantics.

**AC-F02-01:** Valid add/edit/delete and persistent reload work with exact fields, history and nonduplicated IDs.  
**AC-F02-02:** Same-day overlap and overnight/future-date invalid records fail at UI/API/D1; adjacent and past-day entries succeed; concurrency does not bypass overlap guard.  
**AC-F02-03:** Shared Customer integrity, auth and task association protections hold under API calls, not UI-only.  
**AC-F02-04:** Existing production task/customer records, IDs, sequence, schema history, access and configuration are preserved after the additive migration.

### F03 — New/Edit dialogs and Subject selection

- Existing-style **Popup Dialog** for `+ New Log Time` and for Edit; no mandatory inline editing.
- Dialog fields in this order: Customer Name, Task Title, Task Description / Comment, Note, Tracker Link, Activity, Date, Start Time, End Time, Spend Time (Hour).
- **Task Title Dropdown**: instant case-insensitive substring keyword search across **three visible columns**: `Task Title | Description | Customer`. New selection options are only active statuses defined in §3.
- At the **top of the Task Title Dropdown**, show `+ Add Custom Task` **independently of keyword filtering/no matches**. This creates a one-off title in the **current Log Time form**, not a reusable saved option and **not** a Task Tracker task. Future forms must type it again.
- Selecting a Task Tracker task copies **Customer Name, Task Title, task description, Note and Tracker Link** into the form. Customer is locked while a task is linked. The copied description/note/link are editable **only for this Log Time**; no writes back to Task Tracker originals.
- On edit, changing from one tracker task to another recopies the new task's fields; if the current form has user-edited content that would be overwritten, require a clear **confirm or cancel** prompt. Activity, Date, Start and End stay unchanged.
- Switching from tracker task to Custom Task **preserves** existing Description, Note, Tracker Link, Activity, Date, times and Customer, **unlocks** Customer, and removes the tracker-task link. Custom Task Customer is **required** and may be changed.
- Historical log linked to a now-`Closed` task remains visible and editable/deletable. Its saved title and task association must not vanish from the editor merely because Closed tasks are excluded from **new choice lists**. When intentionally changing to another Task Tracker task, only currently eligible non-Closed/non-Deleted tasks can be newly chosen.
- **Activity**: searchable dropdown with exactly `Design`, `Setup`, `Development`, `Testing`, `Support`, `Question`, `Deployment`, `Traveling`, `Fine tuning`, `Meeting`, `Other`. Do not invent new options.
- Customer dropdown uses exactly the same Customer dataset and searchable/selectable behavior as Task Tracker. For linked tasks it is read-only; for Custom Task it is required/selectable.
- Tracker Link retains existing optional URL validation, safe rendering and clickable-link handling. Do not turn plain untrusted text into unsafe navigation.
- **AC-F03-01:** Three-column search, top Custom Task command, no-result command visibility, auto-populate mapping and linked Customer lock all work.  
- **AC-F03-02:** One-off Custom Task never appears in Task Tracker or as a reusable dropdown option; its saved Log Time remains readable/editable.  
- **AC-F03-03:** Edited copied details do not alter task originals; replacement confirms before overwriting edited contents; linked → custom retains values and unlocks Customer.  
- **AC-F03-04:** All 11 Activity options, keyboard/touch, Light/Dark, mobile dialog fit and validation are tested.

### F04 — Task Tracker `Time Spent` aggregation

- Show **Time Spent** for Task Tracker tasks as the sum of all currently persisted Log Time durations with a matching stable `task_id`, across **all dates**, including logs previously associated while task was open and later closed.
- Custom Task logs have null task link and **never** contribute to Task Tracker Time Spent.
- Changes, deletion and task reassociation must immediately reflect correct totals: Task A → Task B subtracts from A/adds to B; linked → custom subtracts from old; deleting subtracts; modifying dates/times recalculates.
- Prefer a derived/read aggregation or another concurrency-safe invariant rather than overwriting task fields; choose implementation that prevents stale totals, double counting and arbitrary writes to task business fields. Do not increment the existing task ID sequence for Log Time.
- Closed linked task permits editing/deleting **historical** logs, and its total changes accordingly; Closed task is **not** available for new log creation or reassignment.
- **AC-F04-01:** Example linked task 1h on Monday + 2h Tuesday reports **3.00h**; independent task logs cannot affect it.  
- **AC-F04-02:** Edit/delete/retarget and closed-history corrections immediately display exact totals, never negative or double counted.  
- **AC-F04-03:** All existing Task Tracker status and task-mutation logic remains intact.

### F05 — Log Time views, dashboard and table

- Within Log Time workspace show view tabs exactly **`Today | This Week | Show All Data`**; tab scope is based on each log's work **Date**, not created timestamp.
- Week runs Monday 00:00 through next Monday 00:00 in Malaysia (UTC+08), consistent with existing Tracker weekly semantics.
- Dashboard cards, visually consistent with Task Tracker: **`Total`** = total number of Log Time **records** (not distinct Task Titles), **`Today`** = total logged hours for today's work Date, **`This Week`** = total logged hours in current Malaysia week. Implementation should make dashboard scopes explicit; no unapproved customer grouping.
- Log Time table uses **date-only Accordion grouping**, default Date descending (newest first); within each date prefer ascending Start Time as readable daily chronology. Header presents the date and corresponding day's **total spent hours**. Supports collapsing/expanding, responsive behavior, and existing theme.
- Confirmed **compact columns only**: `Time (Start–End)`, `Task Title`, `Customer`, `Activity`, `Spend`, `Actions (Edit/Delete)`. Date appears as group header. Description, Note and Tracker Link live inside the detailed popup rather than as always-visible table columns.
- **AC-F05-01:** Today/This Week/All scopes, totals and Malaysia calendar boundaries are correct for records created later than their work date; Total counts records, not unique tasks.
- **AC-F05-02:** Date grouping, daily duration totals, descending-date sort, table compact columns, expanded/collapsed state and actions work on desktop/mobile and both themes.
- **AC-F05-03:** Saved descriptions, notes and links remain accessible in Edit; original Task Tracker dashboard and view tabs are unaffected.

### F06 — Quality gates, deployment and evidence

- Implement only in existing `sites/react-d1/` React + Worker/API + D1. No legacy `app/` development. Add only versioned, backward-compatible database migration(s) required for a new Log Time table, indexes, sequence if justified. **Never truncate or overwrite existing D1**.
- Regression: 56+ baseline API/D1/weekly suite, existing React components and 9+ browser scenarios, then Phase 2-specific validations, transactional race tests, status eligibility/closed-history, cross-module Time Spent, customer deletion protection, date boundaries, URL safety and search.
- UI acceptance: real Chromium **1440px desktop and 390px mobile** × Light/Dark, all tabs/cards/dialogs/confirmations/keyboard/touch. No production CRUD tests; use isolated local D1 fixtures.
- Prepare read-only **full-row** production baseline: existing tasks/customers, app_sequence, app_revision token/value, full access policy, DB/schema state and Site URL. A new Log Time table must initially be empty unless existing legitimate data is independently evidenced; no test seeds. Additive schema differences are expected and must be enumerated; legacy rows/data must match predeploy baseline.
- PR/merge is distinct from Sites deployment. Deploy **existing** Sites project only when CI and browser gates succeed, migration is proven additive, a rollback plan exists and there are no outstanding irreversible-data blockers. Preserve exact existing Site URL, owner-only policy, secrets, D1 binding and historical tasks/customers. Record real GitHub SHA, Sites source SHA, version/deployment ID/time (MYT), data reconciliation, browser evidence and add to `docs/PROJECT_STATUS.md`.
- **AC-F06-01:** CI/build/browser passes; additive migration verified in isolated D1; no production task/customer record corruption, task ID resequencing or permission changes.
- **AC-F06-02:** Actual existing-Sites release and live browser acceptance explicitly verified, with before/after D1 and access checks and documented rollback; otherwise label deployment **Not verified / Not done**.

## 5. Core workflow / acceptance examples

1. Create linked entry for existing eligible `JXM / Prepare FDD`: choose searchable task → copied description/note/link/customer, locked customer → choose Activity and Date → 09:00–10:00 → 1.00h → save. On another day add same task 2.00h: tracker displays 3.00h.
2. Create `Internal Meeting` using **top** `+ Add Custom Task`, choose shared `MySelf` Customer and Meeting Activity. Saved row persists, Task Tracker unchanged; on a fresh dialog no reusable `Internal Meeting` option was created.
3. Edit linked entry from Task A to eligible Task B: confirmation before discarding modified auto-populated text; new task values copied, customer changed and locked, Activity/Date/times retained; cumulative hours removed from A and added to B.
4. Edit Task A-linked entry to one-off Custom Task: copied description/note/link/customer retained, customer unlocked, task link cleared; Task A's aggregate reduced.
5. Close a Task Tracker task with historical logs: absent from new Subject choices; existing log can still be edited/deleted and correctly adjusts displayed total.
6. Same-date `09:00–11:00` and `10:00–12:00` conflict; `11:00–12:00` is valid. `23:00–01:00` and future Date invalid; past Date allowed.
7. Today/This Week depend on Date and local Malaysia calendar boundaries, not created_at. All Data includes historical entries; daily Accordion shows exact total.

## 6. Engineering decisions not yet independently confirmed

These items are **not user-approved new business rules** and must be resolved by examining existing code and data-safety behavior; do not silently substitute guesses:
- **D001 (High, integrity):** Exact treatment of Task Tracker `Deleted`/hard deletion when linked Log Time exists. Required invariant: never orphan or silently cascade-delete historical time logs or lose their task identity. Favor a blocking referential guard for destructive deletion until a safe and reviewed approach is established; ask the user before changing existing deletion semantics.
- **D002 (Low, presentation):** How to display Time Spent in existing Task Tracker table/cards and format 0h, long durations and rounding without crowding mobile. Keep this strictly presentational, visually consistent with existing UI.
- **D003 (Low, dashboard presentation):** Scope independence of dashboard cards when different Log Time view tab is selected; avoid replacing their explicitly named Total/Today/This Week meanings. Validate expected counters in UI acceptance.
- **D004 (Medium, draft UX):** Task title selection when a dialog has unsaved edits and a new task is chosen; confirmation must preserve cancel path and all other form fields.

## 7. Traceability and release status

- Scope reviewed and approved through multiple user confirmations on 2026-10-19; includes options **A/B** for Custom Task one-off, independent popup editing, compact table, no-overlap, same-date only, past-date-only, copy-on-select and locked linked Customer.
- This document approval is **not** implementation, PR merge, test, D1 migration, Sites version, or live release.
- Existing release baseline remains **Sites Version 12** until independently verified otherwise.
- Canonical project history: `docs/PROJECT_STATUS.md`. Keep past completed CR-005–CR-016 and released versions unchanged, not reopened.


## 8. Approved Phase 2 follow-up — Log Time UX parity with Task Tracker (2026-10-19 MYT)

**Approval:** User requested all three enhancements, then explicitly selected option **A**: **existing Log Time records opened in Edit Dialog must use Auto Save** for ordinary editable fields; **Date / Start Time / End Time are saved together using Save Time**. These requirements extend the existing Phase 2 PRD, without reopening completed original F01–F06 scope. **Implementation pending.** The latest GitHub-recorded production baseline is **Sites Version 13** (2026-10-19); verify live before any new release.

### CR-017 / F05 extension — Log Time Search Bar

- Add a visible Log Time search bar with **Search** and **Clear** buttons, consistent with Task Tracker's existing global search UI, keyboard Enter-to-search, empty/reset state, theme styling, and mobile responsiveness.
- Search the **Log Time records themselves**, independently of Task Tracker's search state. Case-insensitive, partial keyword/substring matching across **Task Title, Customer Name, Task Description/Comment, Note, Activity and Tracker Link**. Include Date text where practicable without changing stored date formats.
- Search is scoped to the current **Today / This Week / Show All Data** Log Time view and preserves its existing date-range eligibility; **Search** applies the query and **Clear** restores the unfiltered rows in the current view. The search query must not alter persisted data.
- Retain date-only Accordion groups, descending date order, ascending Start Time inside each day, and correct **filtered** daily subtotals. Preserve top-level Dashboard card meanings (Total = all Log Time record count, Today/This Week = all relevant work-date hours) independently of search; do not relabel them as filtered counts without a further user decision.
- Show an accessible **No results found** message for zero keyword matches without suggesting the underlying Log Time database is empty. Do not change Task Tracker's own global search functionality.
- **AC-CR-017-01:** Search by partial Customer/Task/Activity/Description/Note/Tracker Link finds matching rows, case-insensitively, within the selected view. Clearing restores prior view contents.
- **AC-CR-017-02:** Date group headers, filtered daily hours, chronological order, dashboard totals, dropdowns, and Task Tracker independent search continue to work; no-result and mobile/keyboard/theme states are tested.

### CR-018 / F03 extension — Auto Save in Edit Log Time only

- **Only existing Log Time records** (`Edit Log Time` dialog) auto-save ordinary editable fields, using the existing **Task Tracker Edit Task** interaction pattern. **New Log Time** continues to use an explicit **Save Log Time** / Create action; merely opening a blank New form or typing a draft must not persist a record.
- **Auto-save upon blur** for text input/textarea edits: **Task Description/Comment, Note, Tracker Link**, and the free-text **Custom Task Title**. Selectors (**Activity**, **Customer when Custom**, and **Task Title/association**) save when selection is committed, not on search keyword typing. Customer remains locked for linked tasks.
- The existing task-selection/autopopulate and safety contract remains: switching linked task A → B copies title/description/note/link/customer, subject to existing **confirmation before overwriting edited content**; commit the entire logical association change **atomically** and recalculate both related Time Spent totals. Switching to a one-off Custom Task retains existing copied content and Customer, unlocks Customer, and safely removes prior link. Do not silently persist an incomplete Custom Task title before it has a valid value.
- **Date, Start Time and End Time are intentionally excluded from per-field Auto Save.** Users edit these as one draft and click a distinct **Save Time** action. Save Time submits the three values in **one atomic update**, validates Malaysia date rules, end > start, same-day-only, no overlaps (including concurrent editors), and recomputes derived duration and linked Task Tracker Time Spent. Changing date/time input or leaving either time field without clicking Save Time must **not** persist any partial time change.
- Prevent draft loss and race conditions: serialize normal field saves against each other and Save Time, and use the current `updated`/revision conflict protection (`expectedUpdated`) so one save cannot revert another. Preserve authoritative server-returned values; avoid partial snapshots, stale overwrites, duplicate updates or repeated Time Spent accumulation.
- UI displays a clear **Saving… / Saved / Save failed** state. On validation/API/conflict failure, retain the user's input and display a meaningful error, with retry or safe reload path; do not show success before a server acknowledgment. On dialog close, wait for in-flight saves or warn appropriately, preventing silent loss. The edit dialog must not require the old overall **Save Log Time** button for fields that are auto-saved; **Save Time** remains explicit for the three time fields.
- Editing historical Log Time linked to a **Closed** task stays allowed; auto-saving textual changes must not silently relink it, reset copied values or change Task Tracker's original task content. Deleting a log remains separately confirmed and recalculates derived totals.
- **AC-CR-018-01:** Existing log text/textarea blur and dropdown selection persist immediately and survive close/reopen and refresh; no global Save Log Time action is required for these fields.
- **AC-CR-018-02:** New Log Time requires explicit Save Log Time; invalid/unfinished new drafts are never auto-created.
- **AC-CR-018-03:** Date, Start, End edits do not persist on blur; Save Time atomically validates and updates duration; overlap/overnight/future-date failures leave existing persisted time and task totals unchanged.
- **AC-CR-018-04:** Rapid sequential edits, API failure, stale revision, changing linked tasks, customer lock, custom titles and Closing with in-flight requests do not lose data or miscount linked Time Spent.
- **AC-CR-018-05:** Distinct save statuses and failure messages are accessible in Light/Dark desktop/mobile dialogs.

### CR-019 / F05–F03 extension — Double-click Log Time row to edit

- Reuse existing Task Tracker table row interaction: **single click selects/highlights the Log Time row**, **double click opens that row's Edit Log Time Popup Dialog**, and **Enter** on a keyboard-focused selected row opens the same dialog. The existing row **Edit** button remains available; **Delete** remains available with its existing confirmation.
- Use the row's stable Log Time `id`, not a date/row index, to prevent opening the wrong record after sorting, search or view change.
- Do not trigger accidental edit when users click **Delete**, **Edit** or date-group expand/collapse buttons; interactive button events must not bubble into row double-click behavior. Keep visible focus/selection indication and appropriate `tabIndex`, `aria-selected` and labels.
- Reuse the single existing Edit Dialog and CR-018 Auto Save behavior. Do not create duplicate dialogs, alter Log Time grouping, or change Task Tracker's existing double-click support.
- **AC-CR-019-01:** Single click selects; double click or keyboard Enter opens the correct Log Time with all saved values; Edit/Delete controls retain their original behavior.
- **AC-CR-019-02:** Correct under filtered rows, grouped dates, Light/Dark, 1440px desktop and 390px mobile; touch access via Edit button remains usable.

### Release and regression safety for CR-017–CR-019

- Modify the **existing Sites React + D1 project** in `sites/react-d1/`, preserving existing production deployment, full customer/task/log data, IDs, revision/sequence, URL, DB, secrets, access and config.
- Prefer reuse of the current `LogTime.tsx`, `TaskTable.tsx`, `Editors.tsx`, `SearchPicker` and `createSaveQueue` patterns; inspect actual repo implementation before coding. The existing `PATCH /api/log-time/:id` supports partial changes via merge-then-validate but must be checked for revision-safe queued Auto Save; **do not assume API robustness without tests**.
- No new D1 schema or migration should be required for these **UX-only** changes. If implementation uncovers an unavoidable migration, stop and validate its necessity and safety before production.
- Run existing 90-test baseline plus targeted automated API/D1/React and real Chromium acceptance; verify 1440px desktop / 390px mobile × Light/Dark, keyboard/touch, date filters, error/retry/conflict, atomic Save Time, activity/subject/customer dropdowns, customer guard and all original Task Tracker regressions.
- Use isolated local/test D1 for **all mutation testing**. Production verification is read-only. For a verified production update, record **separate** GitHub implementation PR/merge and actual Sites version/source SHA/deployment ID, authenticated browser acceptance, before/after full-row equality for tasks, customers, Log Time, task sequence/revisions and unchanged owner-only access.
- No code/test/merge/Sites change is asserted by this PRD requirement update alone. Proposed next Site release number is **14** only if deployment tooling assigns it; never label deployed before direct evidence.
