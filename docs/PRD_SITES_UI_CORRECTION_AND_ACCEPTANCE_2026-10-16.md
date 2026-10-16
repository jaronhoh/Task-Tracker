# PRD — Task Tracker Sites UI Correction & Release Acceptance

**Date:** 2026-10-16  
**Status:** Open — user-reported Version 6 UI defects; implementation and browser acceptance pending  
**Target:** Existing ChatGPT Sites React/D1 application only  
**Reference:** Version 6 Sites deployment recorded at 2026-10-16 14:47:27 MYT. The user reports that the requested UI issues are **not resolved**. Do not treat deployment success or passing unit tests as acceptance.

## 1. Background and problem
Version 6 deployment is recorded as successful, with 65 automated tests and production data preservation. However, browser click/keyboard and visual acceptance were explicitly not performed. The user reports the actual UI still has issues:
1. Tabs look like separate square/bordered buttons instead of a **line-style TabsList**.
2. Summary Cards do not work as interactive filters, including Weekly Task cards.
3. Accordion default expansion does not meet the expected behavior.

This PRD supersedes any conflicting legacy Express UI PRD. The previous Express PR #5 was closed without merge.

## 2. Product and architecture constraints
- **Single live product:** existing ChatGPT Sites React application backed by existing D1 binding `DB`.
- Do **not** develop/deploy PocketBase/PocketBay, SQLite/Express, or a replacement Site.
- Do not create/reset/migrate/seed the production database. Preserve tasks, customers, task IDs, app_sequence, app_revision, URL, hosting configuration and access policy.
- Preserve Malaysia UTC+08 weekly boundary, Closed This Week eligibility, search, edit, export and status business rules.
- GitHub `jaronhoh/Task-Tracker` is the PRD/handoff/version-history repository. The historical `app/` Express code is **not** a production source. Keep Sites React source in a separate identifiable directory/repository if export/sync is supported; do not pretend GitHub main is the Sites deployment commit.

## 3. Functional requirements

### FR-01 — Line-style TabsList
- Tabs: `Weekly Task`, `Current Week Status`, `Show All Data`.
- Render as one horizontal TabsList with **no individual rectangular borders, filled button backgrounds or boxed appearance**.
- A subtle common baseline and blue underline/text identify the selected tab; hover/focus remain accessible.
- On narrow screens, allow horizontal scrolling without wrapping or hiding a tab.
- Switching tabs preserves existing task-view semantics and resets view-specific card selection to its default.

### FR-02 — Clickable Weekly Task summary cards
- Cards: `Overall Total`, `Carry Over`, `New This Week` (retain current names and counts).
- `Overall Total` shows both weekly groups. `Carry Over` shows only Carry Over; `New This Week` shows only New This Week.
- Clicking the currently selected non-total card again restores `Overall Total`.
- Filter changes the visible group/task list immediately without navigation or server writes.
- Selected card has an obvious border/background state and programmatic pressed/selected state.
- Card counts derive from the searched weekly dataset **before** card filtering, so selecting a card does not zero other cards.

### FR-03 — Clickable Current Week Status summary cards
- Cards: `All`, `Work in Progress`, `Pending with Customer`, `KIV`, `Closed`.
- Selecting a card displays only that status group/tasks; `All` restores all four groups.
- Clicking the selected status card again restores `All`.
- Counts are based on the searched weekly scope **before** status-card filtering.
- Filtering must not mutate task status, the D1 database, or unrelated view state.
- The existing colored status count badges remain visible.

### FR-04 — Accessible group accordions
- Weekly Task: `Carry Over`, `New This Week`. Current Week Status: the four status groups.
- **Default open when count > 0; default closed when count = 0.** Default is determined after current search/filter eligibility.
- Each accordion toggles independently by pointer and keyboard (Enter/Space); retain header and count when collapsed.
- Use correct expanded state and focus indicators. Do not treat a collapsed group as deleted or filtered-out data.
- On a view or search context change, recompute sensible defaults; avoid surprising expansion/collapse of unrelated groups during a single toggle.

### FR-05 — Search, selection, exports and edge cases
- Search applies before card filters; card counts reflect the searched scope.
- Zero-count cards remain clickable and show an appropriate empty state.
- Task row selection/editing works after expand/collapse/filtering.
- Existing export behavior must be documented and verified to match the intended visible/filter scope; do not silently change historical export semantics.
- Mobile layout: cards remain operable; TabsList remains one-line horizontally scrollable.

## 4. Acceptance criteria — must be verified in a real browser
1. Screenshot proves TabsList has **no square boxes**, and active tab shows a blue underline on desktop and mobile.
2. Click each of the three Weekly Task cards and verify displayed group/task IDs; re-click active group card and verify reset.
3. Click each of the five Current Week Status cards and verify displayed group/task IDs; re-click active status card and verify reset.
4. Expand/collapse each accordion independently by click and keyboard; verify nonzero default expanded and zero default collapsed.
5. Verify search + card filters + accordion interactions, zero results, tab switching, and task selection/editing.
6. Run React tests, API/D1 regressions, typecheck, build, and browser interaction tests; record pass/fail and screenshots.
7. **Before and after deploy**, read-only full-row compare tasks, customers, app_sequence, app_revision; verify project ID, DB binding, URL and access policy unchanged.
8. Deployment success alone **does not** close this PRD. Close only after actual browser visual/interaction acceptance; otherwise status remains Open / Blocked with evidence.

## 5. Delivery workflow
1. Inspect the **actual current Sites React source and rendered UI**; diagnose why Version 6 tests passed while user-visible behavior failed.
2. Update React components/styles in the existing Sites source, not GitHub legacy Express.
3. Synchronize Sites React source to GitHub in a distinct location/repository **if supported and verified**, with commit/PR traceability. Otherwise document the exact Sites source commit and sync limitation; never claim sync occurred.
4. Run tests and capture real browser screenshots and click/keyboard evidence.
5. Deploy to **existing** Site only after preserving data/configuration; use actual assigned version number (do not assume Version 7).
6. Update `docs/PROJECT_STATUS.md` on GitHub with findings, test evidence, deployment ID/version, source commit, browser QA, data integrity, and remaining issues. Distinguish Sites verified / browser verified / GitHub verified / user reported.

## 6. Current evidence and open issues
- **User reported:** Version 6 did not resolve the visible UI problems.
- **GitHub handoff record:** Version 6 deployment succeeded and 65 automated tests passed, but real-browser QA was **not verified**.
- **Not yet proven:** the root cause of bordered tabs, nonfunctional cards, and accordion defaults; do not claim a fix until tested.
