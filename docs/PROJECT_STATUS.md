# Task Tracker — Project Status & Handoff

> **Single source of truth for project progress and cross-conversation handoff.**
> Update this file whenever development, testing, merging, deployment, or production verification changes. Read it at the beginning of a new ChatGPT/Codex conversation.
>
> Last updated: **2026-10-16** (Malaysia, UTC+08:00)
> Project: `jaronhoh/Task-Tracker` · Default branch: `main`

## Architecture decision — ChatGPT Sites only (2026-10-16)

**User directive:** Abandon PocketBay/PocketBase and the legacy SQLite/Express app. The **existing ChatGPT Sites React/D1 application is the only active product**. Do not implement new features in `app/` or deploy the legacy Express app. GitHub may remain a source for PRDs, handoff records, and historical code, but the legacy code is **not** the production deployment source.

- Existing Sites URL, production D1 database, task/customer records, sequences, revisions, and access settings must remain unchanged unless explicitly requested.
- PR #5 (legacy UI accordion / line tabs / clickable cards) **closed without merge** because it targeted Express.
- **Sites UI request:** corrected, browser accepted and deployed as **Version 7**; see latest release evidence below.
- Sites deployment/editing must use supported Sites/Work tooling; GitHub merges alone do not deploy the React/D1 Sites app.
- Do not claim the above UI update is deployed until verified.

## Next approved requirements — Task form and customer management (2026-10-16)

**PRD:** `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md` (GitHub verified; implementation pending).
- CR-005: Optional **Tracker Link** in **New Task and Edit Task**, persisted in D1, with clickable Task Table link icon (user confirmed Q1=B).
- CR-006: **Status / Created / End on the same desktop row in both New Task and Edit Task**; responsive mobile.
- CR-007: **Manage Customers supports deleting unused customers only**; any task reference blocks deletion (user confirmed Q2=A); require backend enforcement and confirmation.
- CR-008: Customer Color dropdown displays actual color swatches alongside RGB/HEX codes, including selected value.
- **Status:** requirements approved; React development, tests, database migration review, Sites deployment and browser acceptance **NOT STARTED / NOT VERIFIED**.
- **Production baseline:** Version 7 remains the latest accepted release; do not confuse GitHub PRD commit with Sites source/deployment.
- **Next:** implement via Work on existing Sites React/D1; preserve data, project ID, URL and access. Sync code if supported and update this handoff with verified results.

## Current status — Version 7 accepted

**UI correction is accepted and deployed to the existing Site as Version 7 (2026-10-16 15:46:40 MYT).** Line tabs, Weekly/Status card filters and accordion defaults passed browser acceptance. See the latest release entry for exact evidence and provenance.

| Item | Verified result |
| --- | --- |
| Production | Version 7; deployment succeeded |
| Sites Source Commit | `e54f6d43a7533e4be5b3280f0acb365d5cdeb94d` |
| Automated tests | 70 passed, including 4 real Chromium scenarios |
| Visual/browser acceptance | Desktop 1440px + mobile 390px screenshots; native production click/keyboard checks passed |
| Production data | 32 tasks, 6 customers, sequence next=33 and revision identical before/after |
| URL/access | Existing URL, project ID, D1 DB and complete access policy preserved |
| Source sync | React/D1 source in `sites/react-d1/`, PR #6 |

**Production URL:** https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/

Earlier Version 6 and blocked-candidate entries below are historical and superseded by Version 7.

## Previous release: Version 4 — Closed This Week visibility

**Business requirement:** A task closed during the current Malaysia week must appear in Weekly Task and Current Week Status, even when created in a prior week.

**Week boundary:** Monday 00:00 inclusive → next Monday 00:00 exclusive, Malaysia UTC+08:00.

| Scenario | Weekly Task | Current Week Status |
| --- | --- | --- |
| Created before this week; End/Closed this week | Carry Over | Closed |
| Created this week; End/Closed this week | New This Week | Closed |
| Created before this week; End/Closed before this week | Excluded | Excluded |
| Deleted task | Excluded | Excluded |

Use `End` as the closure timestamp. Preserve all unrelated behaviors and existing data.

### GitHub implementation / test trail

- PRD: `docs/PRD_CLOSED_THIS_WEEK_VISIBILITY_2026-10-16.md`
- Implementation: `app/public/app.js`
- Regression tests: `app/test/weekly.test.js`
- Feature branch: `fix/closed-this-week-visible-20261016`
- Pull request: https://github.com/jaronhoh/Task-Tracker/pull/3
- Successful GitHub Actions run: https://github.com/jaronhoh/Task-Tracker/actions/runs/38842064835
- Tested feature commit: `4608faf2fdf141c2566bc77604d27c605ecf7f09`
- Squash merge to `main`: `6b14576bbc0a7a886cf222f8e28bbdef2e1e00d0`
- GitHub Actions run #91: JavaScript syntax, API tests, and Chromium browser acceptance tests **all succeeded**.
- Earlier CI attempts failed due to overly escaped regular expressions in newly added test assertions; those assertions were corrected before the successful run.

### Sites release report (provided by user)

- Deployment result: `succeeded`
- Online version: **Version 4**
- Source commit: `6b14576`
- Weekly Task / Current Week Status fix: **live**
- Release verification: **62 tests passed**
- Production data preserved: **32 tasks**, customer records, and task-number sequence
- Existing production URL, configuration, and access permissions preserved

## Handoff instructions — REQUIRED

At the **start** of every new ChatGPT / Codex conversation working on Task Tracker:

1. Read this file from GitHub `main` **first**.
2. Check the latest GitHub commit, open PRs, and relevant GitHub Actions results; do not assume this document is newer than GitHub.
3. If the work involves production, check the Sites deployment/version using available Sites tools or ask for an explicit deployment report. **Do not equate GitHub merge with Sites deployment.**
4. Confirm current status and the next action before editing code.
5. Preserve production data, customer records, task-number sequence, Site URL, settings, and access permissions.
6. Update this file **in the same workflow** whenever a PR is opened/merged, tests change state, a release is deployed, or a blocking issue appears.
7. Record the source of each status: `GitHub verified`, `Sites verified`, or `User reported`. Never label a reported status as independently verified.
8. Add a dated entry to the change log below; keep historical entries rather than overwriting them.
9. For feature work, maintain the PRD separately under `docs/`; this file tracks **delivery state**, not the full product specification.

## In-progress change — Colored Group Count Badges (2026-10-16)

- Status: **Deployed — Sites Version 5; React port tested, build and production resource checks passed; database equality verified. Browser visual QA not performed in this environment.**
- Branch: `feat/status-count-color-badges-20261016`
- PRD: `docs/PRD_STATUS_COUNT_BADGES_2026-10-16.md`
- Scope: pill-shaped, status-colored numeric count badges in Weekly Task and Current Week Status group headings; no business logic or database changes.
- CI: **passed** — GitHub Actions run `38847047408`, source commit `a51be08f820428d807961b30e6bdc30d9197c46d` (API tests and browser acceptance tests).\n- Follow-up: keep GitHub legacy main and Sites React source clearly distinguished; synchronize source architecture in a separate reviewed change. Browser visual verification remains outstanding.
- Latest production release: **Version 5** (Sites verified), source `1ea52b12e736ef80d636e20d5d1ea5c0d3017096`.

## Next actions

- Version 7 accepted and deployed; React/D1 source and browser evidence synchronized separately from legacy Express.
- For the next feature or bug fix: write/update PRD → create feature branch → implement → test (API + UI) → review PR → merge → deploy existing Site → verify data preservation → update this file.
- If future checks reveal production discrepancies, open a new issue/PR and log it here.

## Change log

| Date (MYT) | Event | Status | Source |
| --- | --- | --- | --- |
| 2026-10-16 | Version 7 UI correction, 70 tests, desktop/mobile browser acceptance, production full-row equality | Accepted and deployed | Sites / GitHub CI / browser / production read-only verified |
| 2026-10-16 | Closed This Week PRD, implementation, and regression tests added | Completed | GitHub verified |
| 2026-10-16 | CI Run #91 passed including API and browser tests | Passed | GitHub verified |
| 2026-10-16 | PR #3 squash-merged into `main` as `6b14576` | Merged | GitHub verified |
| 2026-10-16 | Sites Version 4 deployment, 62 tests, 32 tasks and related data preserved | Succeeded (reported) | User reported |
| 2026-10-16 | Colored group count badges PRD and implementation added to feature branch; not yet deployed | In progress | GitHub verified |
| 2026-10-16 | Created persistent project status / handoff record | Completed | GitHub commit of this file |
| 2026-10-16 | Ported PR #4 badges to existing React Site; deployed Version 5; 63 tests and data equality checks passed | Deployed; browser visual QA pending | Sites verified / local tests / production read-only checks |

## Update template for future entries

```md
### YYYY-MM-DD — <short title>
- Change / PRD:
- Branch / PR:
- Test results (link):
- Merge commit:
- Sites version / deployment result:
- Production verification / data preservation:
- Status source (GitHub verified / Sites verified / User reported):
- Open issues / next action:
```


### 2026-10-16 — Existing Sites deployment safety check; publication stopped
- Checked at: approximately 12:08 MYT (UTC+08:00).
- GitHub main reviewed: `d6dc1f796c5408937fea73d0fb86b3c172c0ece6` (before this documentation update).
- PR #4: merged at `c29db45dae9e9d0c0685b8171fcbb51dae7c9630`.
- CI: [Run #103 / 38847758925](https://github.com/jaronhoh/Task-Tracker/actions/runs/38847758925) completed successfully for PR head `d9c976950134e4b4241227d2f6a2973271a2dd97`; JavaScript syntax, API tests and browser acceptance steps succeeded. The workflow-runs connector returned no PR-triggered runs for the latest main documentation commit; this is not proof that all main-triggered workflows passed.
- Existing Site: `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`; Version **4**, saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_dc20876d9fd88191a6fe3ef4449203fd`.
- Actual Sites source commit: `ba23bda994e6423bb133f440d95b860cf3f16e83` (distinct from the GitHub feature merge commit).
- Existing deployment: `appgdep_6ad194b7376481918c39da9db7babf4e`, **succeeded**, deployment record updated **2026-10-16 11:07:49 MYT** / `2026-10-16T03:07:49.166483Z` (Sites verified).
- URL: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site
- Architecture evidence: existing Sites manifest binds D1 as `DB`; production code uses React/Vinext and D1 Repository. GitHub main has no `.openai/hosting.json`, starts Express with `better-sqlite3`, and documents a local `app/data/task-tracker.sqlite` path. PR #4 modifies legacy `app/public/app.js` and CSS; existing Sites renders `frontend/src/TaskTable.tsx`.
- Safety decision: **STOPPED before publication** because direct deployment of main cannot be confirmed to retain/use existing production storage. No new version or deployment created; no production write, migration, reset, import, configuration or permission change.
- Read-only production verification: **32 tasks, 6 customers; Task IDs unique; all task customer references resolve**. These checks confirm current counts/references, not a complete historical field-by-field audit. Sequence high-water mark is not exposed by the read-only API and remains unverified; no task was created to probe it.
- Badge verification: existing Version 4 source still renders group counts as `label (count)`; PR #4 numeric color badges were not deployed. Post-deployment visual verification is therefore not completed.
- Required next action: reconcile GitHub main with the existing Sites-compatible application, port the badge change to React, then validate the unchanged project/D1 binding and immutable migration history before deployment.
- Status sources: **GitHub verified / Sites verified / production API read-only verified**.


### 2026-10-16 — Version 5: React port of colored group count badges
- Authorization: user instructed to proceed with the proposed React port while preserving the existing Site and D1 database.
- GitHub feature reference: merged PR #4, `c29db45dae9e9d0c0685b8171fcbb51dae7c9630`; GitHub main status reviewed at `704bd102d4b52a838a63de7213b3694a2e126667`.
- Deployment method: updated the existing Sites React application based on Version 4; did **not** replace it with the incompatible legacy Express main source. No new Site was created.
- Actual Sites source commit: `1ea52b12e736ef80d636e20d5d1ea5c0d3017096` (pushed to the existing Sites source repository).
- Changed files: `frontend/src/TaskTable.tsx`, `frontend/src/styles.css`, `frontend/test/migration.test.tsx`, `test/react-ui.test.cjs`. No dependency, API, business-rule, database, migration or hosting-manifest changes.
- Badge coverage: Weekly Task Carry Over / New This Week; Current Week Status Work in Progress (blue), Pending with Customer (orange), KIV (purple), Closed (green). Accessible labels and zero counts covered by React rendering tests.
- Validation: **10 React tests + 53 API/D1 tests passed**; TypeScript check, browser-test-file syntax and production build passed. The tsx CLI IPC socket was unavailable, so the same React tests ran successfully via `TSX_TSCONFIG_PATH=frontend/tsconfig.json node --import tsx --test frontend/test/*.test.tsx`.
- Browser limitation: required browser-control capability unavailable; no local browser server or browser acceptance suite was launched. Browser-test expectations were updated, but not executed. This is not full visual acceptance.
- Sites version: **5**; saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_2a391d4c70708191bbc3c6c5213b833b`.
- Deployment: `appgdep_6ad1a404205081918dab6591370d40c0`, **succeeded**, `2026-10-16T04:12:15.405251Z` / **2026-10-16 12:12:15 MYT**.
- URL retained: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site
- Data preservation: read-only, paginated full-row comparison of live D1 `DB` before and after deployment found **32 tasks, 6 customers, app_sequence (task_id next_value=33), and app_revision identical in every field**. No production CRUD test, import, reset, migration or sequence allocation was performed.
- Access and configuration: same project ID and DB binding; complete access policy unchanged; environment revision remains **0**. No configuration or audience mutation was requested or performed.
- Production checks: root page and health endpoint returned HTTP 200; root references new JS. Served JS/CSS returned HTTP 200 and SHA-256 matched local production output exactly. CSS contains all six group badge color classes.
- Served JS SHA-256: `815e9936938ff0bc61d5024b8db151b6114b9862e12c4306b1f4b9c0ef28790d`.
- Served CSS SHA-256: `bf583736039621e3f7a72ee3c4bdab5d598e0d90d38f491e8b9a71c074db7423`.
- Status sources: **Sites verified / production read-only verified / locally tested**. GitHub PR #4 CI remains separately GitHub verified.
- Remaining follow-up: browser visual acceptance; separately reconcile the GitHub legacy main and Sites React source to avoid future incompatible deployments.


### 2026-10-16 — Version 6: Accordion, line tabs and clickable status cards
- Baseline: existing Sites Version 5, source `1ea52b12e736ef80d636e20d5d1ea5c0d3017096`; GitHub PROJECT_STATUS.md read before implementation.
- Architecture: edited only the existing React/D1 Site; no new Site/database, PocketBase/PocketBay, or Express deployment. Existing project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979` and D1 binding `DB` retained.
- UI: Weekly Task two groups and Current Week Status four groups now have keyboard-operable accordion buttons, default expanded, preserving colored count badges. Three tabs use line style with blue selected underline and horizontal overflow. Current Week Status offers All / Work in Progress / Pending with Customer / KIV / Closed buttons with selected styling; filtering is immediate and counts use the searched weekly scope before status filtering. All restores that scope.
- Scope: five files under frontend only. No API, business eligibility rules, database schema, migration history, dependency, environment or hosting changes.
- Local validation: **12 React rendering/model tests + 53 API/D1/weekly regression tests = 65 passed**; TypeScript check and production build passed. Added coverage for default-expanded accordion headers, each status filter, All reset, empty search and independent counts.
- Actual Sites source commit: `28874794e28ddc0e2bfa6c698a7b33fbd37cca8b` (existing Sites source repository; distinct from legacy GitHub main).
- Sites saved version: **6**, `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_126ea02cfc1081919d65e1a9a46fe7dd`.
- Deployment: `appgdep_6ad1c864229c8191888d6d155bf039d8`, **succeeded**, **2026-10-16 14:47:27 MYT** / `2026-10-16T06:47:27.334110+00:00`; environment revision **0**.
- URL retained: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/
- Production data verification: read-only paginated full-row comparison before/after deployment found **32 tasks, 6 customers, app_sequence (task_id next_value=33), and app_revision identical in every field**. All pages were read without reported truncation. No production writes or sequence allocations were used for testing.
- Access verification: complete access_policy unchanged, including revision 1 and owner-only custom audience. No access mutations performed.
- Production availability: root and /api/health HTTP 200; root references new JS asset `index-CTQHzS3o.js`.
- **Not verified:** browser click/keyboard interaction, live accordion collapse/expand, selected-card appearance, tab underline rendering, and mobile horizontal scrolling. The Sites skill requires the control-browser capability for managed-environment browser QA; it is unavailable here, so no preview server or browser acceptance suite was launched. Rendering/model tests and delivered source do not substitute for full browser acceptance.
- Status sources: **Sites verified / production read-only verified / locally tested**. GitHub stores this delivery record; legacy main remains distinct from the Sites application.

- Production asset verification: served JS `index-CTQHzS3o.js` and CSS `index-B6L4GzT7.css` both HTTP 200; SHA-256 equals local production build for both files.

### 2026-10-16 — UI defect report / PRD revision (GitHub verified)
- User explicitly reports Version 6 UI issues remain unresolved; prior browser QA was never completed.
- New requirements and acceptance gate: `docs/PRD_SITES_UI_CORRECTION_AND_ACCEPTANCE_2026-10-16.md`.
- Current status: **Open, not accepted**; Sites UI correction and real-browser evidence pending. No Sites deployment or production mutation performed in this documentation-only update.

### 2026-10-16 — Sites UI correction candidate; browser gate BLOCKED
- Delivery state: **OPEN / NOT ACCEPTED / NOT DEPLOYED**. Production remains **Version 6**; no new saved version or deployment ID.
- GitHub baseline read: `af71944cb34fb710c38643705938cba620a262e8`; canonical correction PRD and this handoff read. Existing open PR #2 targets the historical migration and was not merged. Latest returned Actions runs 38851682627 and 38851677365 failed on `3b89c396a92a67dafb3e5df907d6b8fcc2ae68ca`; they do not test this Sites candidate.
- Sites verified: existing project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, latest version 6, same live URL, custom owner-only audience, access policy revision 1. Opened existing source with supported Sites helper, baseline `28874794e28ddc0e2bfa6c698a7b33fbd37cca8b`.
- Source diagnosis: Weekly summary cards lacked buttons/handlers; status re-click did not reset; all accordion states initialized true, with a regression that incorrectly required empty groups open. Unlayered universal border-color overrides Tailwind's layered transparent tab border, while triggers retain border width. Tab cascade diagnosis is static; actual production rendering is **not browser verified**.
- Candidate: explicit borderless line tabs, full-card native buttons with aria-pressed and repeated-click reset, pre-filter counts, filtered groups/export, populated-open/empty-closed accordions and context resets. Existing business eligibility, API/D1, dependencies, migrations, manifest and runtime settings unchanged.
- Local candidate source commit: `ef390b5ef15637233d56a801a6246fafd8e275b0`. This is **not a pushed/deployed Sites commit**. Existing deployed Sites Source Commit remains `28874794e28ddc0e2bfa6c698a7b33fbd37cca8b`.
- Source sync: branch `fix/sites-ui-correction-20261016`, directory `sites/react-d1/`; 161 tracked UTF-8 source/config/test files (excluding package-lock.json and generated tsconfig.tsbuildinfo). Snapshot includes candidate report; separate `sites/README.md` describes provenance and limitations. GitHub snapshot SHA and Sites source SHA are distinct.
- Executed validation: **13 React tests + 53 API/D1/weekly regressions = 66 passed**, frontend TypeScript noEmit, Sites production build, browser-test syntax, and whitespace checks passed. Local D1 tests do not write to production.
- Browser evidence: **NONE**. Desktop/mobile screenshots, live click/keyboard/visual acceptance and rendered-page inspection remain unperformed. Added/revised Playwright acceptance source, but did **not** execute it.
- Blocker: managed Linux environment; required `control-browser` skill/tool absent from capability discovery. Sites skill: “If `$control-browser` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” No alternative browser path or preview server was launched.
- Release safety: per user's browser-before-deploy gate, no Sites source push/save/deploy, production CRUD, migration, seed, reset, sequence allocation, environment or access mutation. Historical data counts are not independently re-verified in this workflow. Full-row before/after production comparison is still required when deployment resumes.
- Next: supported browser environment → inspect actual Version 6 rendering → candidate desktop/mobile click/keyboard/visual acceptance and screenshots → resolve failures → read-only production snapshot → deploy existing Site → full-row data/access comparison → record actual new version/deployment/source SHA. Keep PRD Open until completed.
- Status sources: **Sites metadata verified / local source and tests verified / GitHub source synchronized; browser acceptance blocked**.

- GitHub candidate traceability: draft [PR #6](https://github.com/jaronhoh/Task-Tracker/pull/6), source snapshot commit `ff5eb1001636a95b9e111b7ecb6d9a1985243d2b`; source exists on the PR branch, not merged main or deployed Sites.

### 2026-10-16 — Version 7: UI correction ACCEPTED and deployed
- **Status: ACCEPTED / DEPLOYED / production browser verified.** This supersedes the earlier blocked candidate entry without erasing its history.
- Sites version **7**, saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_b258d25c2ac08191b9798cf105c02d56`.
- Deployment `appgdep_6ad1d64596908191aec76d6a6250e5ff`: **succeeded**, **2026-10-16 15:46:40 MYT** / `2026-10-16T07:46:40.503185+00:00`, environment revision **0**.
- Actual pushed/deployed Sites **Source Commit: `e54f6d43a7533e4be5b3280f0acb365d5cdeb94d`**. GitHub PR/snapshot commits are distinct.
- Existing URL retained: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/
- Root cause independently browser confirmed on Version 6: tab top/left/right borders were 1px gray, caused by unlayered universal border-color overriding layered border-transparent. Weekly cards had no buttons; empty New This Week was expanded; status re-click remained filtered (17 WIP rows).
- Fix: explicit line-tab border geometry; clickable native Weekly/Status card buttons with aria-pressed, re-click-to-total and pre-filter counts; only selected groups render; populated-open/empty-closed accordions with independent native pointer/keyboard toggles and search/view context defaults.
- Automated acceptance: **13 React + 53 API/D1/weekly + 4 Chromium scenarios = 70 passed**; TypeScript, React build and full local Sites/Vinext production build passed. Final CI [38869014957](https://github.com/jaronhoh/Task-Tracker/actions/runs/38869014957), tested GitHub head `097cfcc8d90ffb35fb67255bbab9ec13a61efbf9`; previous fully passing run 38868869142 also visually reviewed.
- Chromium acceptance at **1440px and 390px** checks all 3 Weekly and 5 Status cards against exact task IDs, repeat reset, counts, zero-card/search states, accordion Enter/Space/click, tab keyboard navigation and one-line layout, row editing, sorting/pagination, save retry/customer/delete/restore in isolated D1, and exported XLSX readback. Six screenshots downloaded; desktop/mobile line tabs, selected cards and scroll layout visually inspected.
- CI honesty: initial runs 38868591837 and 38868722290 had **3 pass/1 fail**, despite green jobs because tee swallowed the test exit code. They are NOT acceptance. Explicit bash/pipefail fixed the workflow. Keyboard tests now await activation and editor focus restoration. Final job logs independently confirm 4 pass/0 fail.
- Browser access: native cloud browser successfully authenticated normally and inspected actual production before/after. Earlier inference that absent control-browser skill meant no usable browser was incorrect. Managed preview refused connections; local Chromium was missing, so candidate browser scenarios ran in GitHub Actions. No replacement preview infrastructure or production test fixtures were deployed.
- Native production browser acceptance after deployment: Weekly counts **25/25/0**, all three filters and re-click resets passed; Status **25/17/1/3/4**, all five filters matched exact live task IDs and reset passed. Both Weekly + all four Status accordions passed Enter/Space. Search TSK-0002 yielded one row and counts 1/0/0/1/0. Opened/dismissed existing task editor without editing. Computed tabs now have **0px top/left/right**, transparent backgrounds and active blue bottom. Production desktop screenshot inspected.
- Data preservation: read-only, paginated full-row DB comparison before/after found **32 tasks, 6 customers, app_sequence task_id next_value=33, and app_revision identical in every field**. No omitted/truncated rows/columns/values. No production CRUD, import, reset, schema migration, seed or ID allocation used in acceptance.
- Configuration/access: same project ID, D1 `DB`, migrations, API/server and dependencies; entire access_policy unchanged (owner-only custom, revision 1). No environment or audience mutation.
- Source sync: [PR #6](https://github.com/jaronhoh/Task-Tracker/pull/6), `sites/react-d1/`, current React/D1 source plus lockfile and tests. Only generated tsconfig.tsbuildinfo omitted. Independent source snapshot stays separate from historical root Express. GitHub docs/evidence are updated after deployment and therefore are not part of the immutable Sites Source Commit.
- Evidence: `sites/evidence/2026-10-16/browser-evidence.zip` (six desktop/mobile PNGs + browser.log), `production-v7.jpg`, `production-browser.json`. Final artifact **12031594913**, SHA-256 **f17c39aa432843ccb4b9ab95c69b3a4452d5a40e3a7754d3e46d93558b133cb9**. Artifact: https://github.com/jaronhoh/Task-Tracker/actions/runs/38869014957/artifacts/12031594913
- Export: all searched/card-filtered tasks in selected groups, independent of accordion collapse; All Data retains all filtered/sorted pages. Verified by XLSX readback; no silent export-scope change.
- Status sources: **Sites verified / GitHub CI verified / Chromium browser verified / native production browser verified / full-row production read-only comparison verified**.

- GitHub reconciliation completed: PR #6 squash-merged into main as `b994332b6093b263afaeaa9ce43d22bd93647b42`. React/D1 source and evidence are now on main under `sites/`; historical root Express files were preserved and not deployed. The handoff-document conflict was resolved by retaining main and overlaying only Sites source, acceptance workflow and final release documents. No application code changed after the passing browser acceptance commit.

### 2026-10-16 — Approved task form/customer enhancement PRD (GitHub verified)
- User confirmed Tracker Link in **New and Edit Task** plus clickable Task Table icon; Status/Created/End same row in **both** forms; customer deletion prohibited if referenced by tasks; color dropdown must display swatches.
- Added `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md`.
- This is documentation only: no Sites code, schema, data, deployment or access changes. Version 7 remains latest accepted release.
