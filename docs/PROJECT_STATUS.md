# CR-020 / CR-021 — Sites Version 15 production release VERIFIED (2026-10-19 MYT)

**Status: DEPLOYED AND LIVE-VERIFIED.** This entry supersedes the two pending-deployment handoff snapshots immediately below it; those notes and all earlier release history are retained.

## Actual release
- Existing Site only: project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`; production URL unchanged: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/.
- Published Sites **Version 15**, saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_4824a5cb7d588191abbce69bdc92d7cc`.
- Native deployment ID `appgdep_6ad5d3b71428819185184f8875ab56e5`; status **succeeded**; native publish response timestamp **2026-10-19 16:24:47.590637 MYT (UTC+8)** / `2026-10-19T08:24:47.590637+00:00`.
- Sites source commit: `251d602ee3c01f561017aba66ab2101a6e745241`. Archive SHA-256: `599FC7CED7B152266771744FE7F145AEF39400393F52ADE44F2D984727CCF9F7`.
- GitHub `main` at deployment verification: `20427344e30e6e0852e9555b42668d1ff6e17d2a`; CR-020/021 implementation merge: `bfbd80eab3c9f626134407a73cabcf2bddc8a6ed` (PR #18). This status update is a documentation-only commit after the release.
- Environment revision remained 0; production D1 binding remains `DB`; no schema change or migration was run. No rollback required; Version 14 remains saved as the prior rollback candidate (`...~appgver_e9372632ffc48191b5ede4511b1d4728`).

## Production UI verification
- Live desktop page showed the CR-020 date heading as `date | hours`; Accordion expanded and collapsed successfully.
- Log Time had exactly five headers: Time (Start–End), Task Title, Customer, Activity, Spend. No Actions column or row Edit/Delete controls were present.
- Single click selected a row; double click and keyboard Enter each opened Edit Log Time. Search and Clear worked. Today / This Week / Show All Data controls were present.
- Light and Dark theme switching both rendered correctly; page was restored to Light. The live page was also checked at an approximately 400 CSS-pixel mobile-width viewport: summary cards wrapped, search controls remained usable, the date separator remained visible, and the five-column table remained horizontally scrollable. CI separately covered exact 390px Chromium viewport in both themes.
- Production Auto Save and Save Time writes were intentionally not exercised. Their successful behavior is supported by the isolated CI run recorded below: 92 passed, 0 failed, including dialog, keyboard, auto-save and save-time coverage. No production record was changed to test writes.

## Production D1 / access integrity
A complete read-only snapshot was taken immediately before and after deployment. Every column and every row field compared identical (order-independent); no rows or columns were omitted or truncated.

| Table | Before = After rows | Columns | Comparison |
| --- | ---: | ---: | --- |
| tasks | 32 | 9 | identical |
| customers | 6 | 3 | identical |
| log_time | 2 | 13 | identical |
| app_sequence | 1 | 2 | identical; next_value 33 |
| app_revision | 1 | 3 | identical; revision 171 |

Site URL, project ID and `DB` binding stayed unchanged. Access remained custom owner-only: one owner account, zero groups, zero external visitors; access-policy revision stayed 1. No production writes, deletes, reset, seed, or migration were performed.

---

# CR-020 / CR-021 — Log Time compact UI merged, Sites release PENDING (2026-10-19 MYT)

**Status: IMPLEMENTED / AUTOMATED TESTS PASSED / GITHUB PR MERGED; NEW SITES DEPLOYMENT AND LIVE PRODUCTION VERIFICATION NOT PERFORMED.** The latest verified production remains **Sites Version 14**, recorded below. GitHub merge is not a Sites release.

- User-approved UX change requirements are in [Phase 2 Log Time PRD §9](PRD_PHASE2_LOG_TIME_2026-10-19.md). Implementation [PR #18](https://github.com/jaronhoh/Task-Tracker/pull/18) was squash-merged into `main` as `bfbd80eab3c9f626134407a73cabcf2bddc8a6ed`; tested PR head `26972f05e3f009200a2845ca1944f75b7477a104`.
- **CR-020:** Date Accordion now shows date, visible pipe, and current filtered-day total as `2026-10-19 | 3.75h` (format example; no hard-coded user data). Date grouping, totals, filters and collapse/expand unchanged.
- **CR-021:** Log Time table now has exactly five columns: `Time (Start–End) | Task Title | Customer | Activity | Spend`. Removes the `Actions` column and row Edit/Delete buttons, and the now-unreachable frontend delete dialog/state. Date header `colSpan=5`. Row selection, double-click and Enter still open the same Edit Log Time dialog; ordinary-field Auto Save and separate Save Time remain unchanged. **No backend DELETE API or stored records were removed.**
- Changes: `sites/react-d1/frontend/src/LogTime.tsx` and updated `sites/react-d1/test/log-time-ui.test.cjs`; docs PRD and status. No Worker API/rules, D1 migration/schema/dependencies, Site config, or authentication/policy changes.
- Final [CI run 39219104492](https://github.com/jaronhoh/Task-Tracker/actions/runs/39219104492) succeeded on tested implementation head: **16 React/model + 62 API/D1/weekly + 14 real Chromium = 92 passed, 0 failed**. TypeScript, React build, full Sites/Vinext production build and chromium desktop (1440px)/mobile (390px), Light/Dark all passed. Chromium asserts visible date separator, exactly five headings/cells, absence of row Edit/Delete controls, double-click and Enter edit, original auto-save/Save Time, preservation of historical logs and original Task Tracker behavior.
- **No new native Sites deployment was performed or verified in this ChatGPT session.** Publish the merged `main` using authorized Sites/Work publishing workflow into the **same** existing project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979` and URL `https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/`. Before publish obtain complete read-only D1 records for tasks/customers/log_time/app_sequence/app_revision and owner-only permissions, then compare after; preserve all historical rows, DB binding, task numbering, environment and owner-only access. No reset/seed/production test writes. Record actual saved Site Version, deployment ID, source commit, timestamp and live UI evidence **only after** they are verified. Last verified rollback candidate is saved Version 14 `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_e9372632ffc48191b5ede4511b1d4728`.

# CR-020 / CR-021 — Log Time date separator and actionless table (2026-10-19 MYT)

**Status: USER-APPROVED REQUIREMENTS / IMPLEMENTATION PR IN PROGRESS; SITES RELEASE NOT VERIFIED.** The latest verified production remains **Sites Version 14** (2026-10-19, see historic release entry below). Do not label this change as deployed until a distinct native Sites publish and production validation confirm it.

- Requirements: `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md` §9. **CR-020:** Date Accordion heading becomes `2026-10-19 | 3.75h` with a visible separator and existing rounded display. **CR-021:** remove Log Time `Actions` column, Edit/Delete row buttons and now-unreachable frontend delete popup; retain five columns: Time (Start–End), Task Title, Customer, Activity, Spend. Date-group colspan becomes five. Double click and keyboard Enter still open existing edit dialog and keep Auto Save / Save Time; single-click selects.
- Only Log Time presentation and matching tests are in scope. No backend DELETE API removal, record deletion, D1 migration, versioned DB change, customer/task changes, environment, hosting, Site URL or owner-only access-policy changes are approved.
- Implementation branch `feat/cr020-cr021-logtime-accordion-cleanup-20261019`. CI and browser acceptance must pass before implementation PR merge. GitHub merge and Sites deployment are separate milestones.
- Required before deployment: full read-only production D1 snapshot including tasks/customers/log_time/app_sequence/app_revision, unchanged owner-only access/environment/DB binding; after native existing-project deployment compare all rows/fields, verify actual Site Version and new 5-column/Accordion UI, and append verified results to this status log. Do not modify production data merely to test.

# CR-017 / CR-018 / CR-019 — Sites Version 14 deployed (2026-10-19 MYT)

**Status: DEPLOYED; production non-mutating interaction checks and full-row D1 preservation VERIFIED.** This entry supersedes the pending-publication entries below; historical records are retained. Successful mutation acceptance is verified in isolated D1/Chromium CI, not by modifying production records.

## Actual release
- Existing production Site: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/ ; project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`. No new Site created.
- Actual Sites **Version 14**; saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_e9372632ffc48191b5ede4511b1d4728`.
- Actual Deployment ID: `appgdep_6ad5c38537f8819192d25ae6a7221b86`; native status **succeeded**; completion timestamp **2026-10-19 15:15:43.041304 MYT (UTC+8)** / `2026-10-19T07:15:43.041304+00:00`; environment revision 0.
- Sites source commit: `8fca9b22ae254f6ceafd7d272fc777b8bc82a8ba`; release archive SHA-256 `4ef057477ac30dafa576f51ec1f37731fd0b326625363a2a38ff69a106196d99`.
- GitHub source: `main` at `92fbb347a64f95c35811670fd1f3f0c020bda4d3`, including approved implementation commit `1b0fc57db3464e93aff70d56aed2349fec5826d5` ([PR #17](https://github.com/jaronhoh/Task-Tracker/pull/17)). Compare confirms the only commit after implementation was the status-document update. All **175 tracked files** under `sites/react-d1/` matched GitHub blob hashes exactly before packaging; the existing Sites-only generated `tsconfig.tsbuildinfo` was retained. Source push and archive packaging completed through the Sites workflow before native owner-private publication.
- No server business-rule, migration, schema, dependency, hosting manifest, environment, or access-policy changes. Existing migration files were unchanged; no reset, seed, reimport, manual migration reapplication, or production API mutation was performed.

## Validation evidence
| Check | Actual result |
|---|---|
| Local API/D1/weekly/Log Time tests | **62 passed, 0 failed**, isolated test database |
| Local React/model tests | **16 passed, 0 failed**; TSX loader used after CLI IPC pipe was unavailable |
| TypeScript and production build | Passed frontend TypeScript check and full Sites/Vinext build |
| Chromium acceptance | [CI run 39213478284](https://github.com/jaronhoh/Task-Tracker/actions/runs/39213478284), job `117931881246`, verified completed/success at tested PR head `a0de627e3699e77b793ac6f4f664301ae0865ec7`; logs show **14 passed, 0 failed**, including named CR-017–019 Search/Clear, double-click/Enter, Auto Save and atomic Save Time acceptance |
| Production Search Bar | Authenticated actual Version 14: Today search `JXM` returns one row and date subtotal **3.50h** while dashboard remains **2 / 3.75h / 3.75h**; Clear restores both rows and **3.75h** date subtotal. This Week unmatched search shows **No results found**; switching Show All Data clears search and restores both records |
| Production Double Click / Enter | Double-click existing `Task/Tracker update` row opens **Edit Log Time**; selecting row then Enter also opens existing dialog; original values displayed |
| Production Auto Save | Leaving unchanged Description triggers **Saved** status (no-change branch; no database write). Successful changed-field persistence and queued/stale-editor behavior were exercised in isolated CI, **not production** |
| Production Save Time | Initially disabled; editing End from `09:15` to `08:59` shows **Time changes not saved** and enables Save Time. Clicking Save Time rejects with **End Time must be later than Start Time on the same Date. Use HH:mm.** Draft restored to `09:15`; button disabled again; dialog closed without write. Successful atomic Date/Start/End persistence is covered by isolated CI, **not production** |
| Theme/layout | Actual desktop production Light/Dark inspected; original Light/Today restored. Mobile acceptance relies on existing CI; no new live mobile session was run |
| Source whitespace | Git diff check reported an existing CRLF/blank-line trailing-whitespace warning in GitHub source `test/react-ui.test.cjs:421`; retained exact approved source bytes, no runtime impact asserted from that warning |

## Production data, configuration and access preservation
Read every page of every user table through native read-only Sites database tools before deployment and after live interaction checks. Both snapshots were complete: no omitted rows/columns or truncated values. Compared **every field of every row**, independent of row order.

| Table | Before | After | Result |
|---|---:|---:|---|
| `tasks` | 32 | 32 | All rows, IDs and field values unchanged |
| `customers` | 6 | 6 | All rows and field values unchanged |
| `log_time` | 2 | 2 | All rows, UUIDs, timestamps, times and field values unchanged |
| `app_sequence` | 1 | 1 | Entire row unchanged; task next value **33** |
| `app_revision` | 1 | 1 | Entire row/token unchanged; revision **170** |

- Same project, Site URL and hosting manifest; native database overview still reports existing binding **DB** and the same five user tables. The database overview does not expose a physical D1 identifier; no database replacement operation was requested or performed.
- Entire native access policy compared equal: **custom, owner-only**, sole owner unchanged, no editors/groups/external visitors, policy revision **1**.
- Native runtime environment response compared equal before/after; deployment environment revision **0**.
- No production records were created, edited or deleted during acceptance; all original task/customer/log values and allocation state were preserved.
- Rollback reference if needed: previous saved Version 13 `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_94d39cf96d30819183352ac54faf2298`; retain production D1 records.
- Evidence classification: **GitHub source/CI verified; native Sites release verified; authenticated desktop production UI observed; complete production D1 before/after verified**. Production successful-write behavior and live mobile behavior remain untested in production, with isolated CI coverage stated separately.

---

# CR-017 / CR-018 / CR-019 Log Time UX — GitHub implementation merged, Sites publish PENDING (2026-10-19 MYT)

**Status: IMPLEMENTED / TESTED / GITHUB MERGED; SITES DEPLOYMENT AND LIVE PRODUCTION VERIFICATION NOT DONE.** GitHub and the real Sites release are separate actions. **Current last verified production is Sites Version 13**, whose full native release and D1/access evidence is preserved below. No Version 14 or other new published version is claimed.

- Implemented user-approved CR-017, CR-018, CR-019 from [Phase 2 Log Time PRD §8](PRD_PHASE2_LOG_TIME_2026-10-19.md), merged via [implementation PR #17](https://github.com/jaronhoh/Task-Tracker/pull/17). PR head `a0de627e3699e77b793ac6f4f664301ae0865ec7`; squash-merged `main` commit `1b0fc57db3464e93aff70d56aed2349fec5826d5`. PR #16 remains the prior, approved requirements-only PR.
- CR-017: Log Time global Search/Clear scoped to Today / This Week / Show All Data, independent of Task Tracker; substring keyword match on title, Customer, Description, Note, Activity, Tracker Link and Date, preserving date-only groups, filtered daily subtotals and original unfiltered Dashboard meanings.
- CR-018: **Existing** Edit Log Time Dialog automatically saves ordinary text inputs on blur and dropdown choices on selection; edits are serialized and use `expectedUpdated` stale-editor protection; visible save status and failure handling; New Log Time still requires explicit Save. Date + Start Time + End Time remain unsaved until a separate **Save Time**, which submits these three together via existing transactional API and checks overlaps, date and duration before updating the derived Task Tracker Time Spent. Confirmation for Task A→B, Custom Task preservation and Closed history continue to apply.
- CR-019: click selects/highlights Log Time row; double click or keyboard Enter opens the existing Edit Dialog; the Edit/Delete buttons are preserved and stop event propagation, date Accordion remains independent.
- Implementation files: `sites/react-d1/frontend/src/LogTime.tsx`, keyword test `sites/react-d1/frontend/test/log-time.test.tsx`, Chromium CR-017–019 acceptance `sites/react-d1/test/react-ui.test.cjs`, and compatibility adjustments to preexisting `sites/react-d1/test/log-time-ui.test.cjs`. No Worker business rules, D1 schema, migration, existing task/customer data, site configuration or access policy were changed by this GitHub code merge.
- Final [GitHub CI run 39213478284](https://github.com/jaronhoh/Task-Tracker/actions/runs/39213478284) succeeded on exact tested PR head: **16 React/model + 62 API/D1/weekly + 14 real Chromium = 92 passed, 0 failed**. TypeScript, React build and full Vinext/Sites build passed. Browser acceptance covered desktop 1440px and mobile 390px and existing historical Log Time four-theme scenarios; new CR-017–019 tests cover search, double click, keyboard Enter, edit Auto Save, unsaved Date/Time and explicit Save Time. Prior failing CI run 39212946094 was due to stale test assumptions for the replaced Edit Save button and a test-fixture assertion; revised browser tests passed in final CI. This is implementing-agent self-check, not independent manual review.
- **Production update still required:** use the authorized ChatGPT Work/Sites-native publishing workflow, target the **existing** project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979` and existing URL `https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/`. Compare full read-only D1 snapshots of **all tasks, customers, Log Time records, sequence/revision token**, access policy and Site configuration before/after. Do not reset, seed, overwrite production data or reapply the Phase 2 additive schema. Check the authenticated actual site at desktop/mobile Light/Dark without production writes, record real saved version, deployment ID, Sites source SHA and timestamp, and only then mark deployed. **Rollback target** if needed: last verified saved Sites Version 13 (`appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_94d39cf96d30819183352ac54faf2298`), retaining all legitimate D1 Log Time records.

# Log Time UX follow-up PRD merged — CR-017/018/019 (2026-10-19 MYT)

**GitHub verified:** Approved Phase 2 Log Time UX changes have been documented and merged into `main` in [PR #16](https://github.com/jaronhoh/Task-Tracker/pull/16), squash merge `ef395e47bc3003a399581f5b7735443a74c9c5bd`. Full scope/acceptance in `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md` §8. Changes: **CR-017 Log Time Search Bar; CR-018 existing Log Time edit-only Auto Save for regular fields and explicit atomic Save Time for Date/Start/End; CR-019 double-click/Enter row to open existing Edit Dialog**.

**Not yet implemented or deployed by PR #16:** No CR-017–019 application code, regression test, Sites deployment or live acceptance is claimed. Latest verified production in this canonical record remains **Sites Version 13**, not Version 14. Next owner/action: authorized coding and Sites release workflow, implement from merged PRD; run isolated D1 and Chromium desktop/mobile Light/Dark tests; merge implementation PR separately; update existing Site; validate all production rows/IDs/config/policy unchanged and record actual release metadata. This post-merge status update is documentation only.

# Approved Log Time UX improvements — CR-017 to CR-019 (2026-10-19 MYT)

**Status: USER-APPROVED / PRD DOCUMENTATION UPDATED; IMPLEMENTATION AND SITES DEPLOYMENT NOT DONE BY THIS DOCUMENTATION CHANGE.** Last recorded verified production remains **Sites Version 13** (2026-10-19 12:33:58 MYT). Historical Version 13 release evidence and earlier entries are preserved below.

- New PRD requirements: `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md` §8 on feature branch `docs/cr017-cr019-logtime-parity-20261019`.
- **CR-017**: Add independent Log Time Search Bar matching existing Task Tracker Search / Clear behavior, across Subject, Customer, Description, Note, Activity, Tracker Link (and practical Date search), scoped to Today / This Week / Show All Data; retain date Accordion grouping and baseline dashboard totals.
- **CR-018**: In **existing-record Edit Log Time Dialog only**, plain text fields auto-save on blur and valid option selections auto-save immediately; **new** Log Time still requires explicit Create/Save. Date + Start Time + End Time persist **together only after Save Time**, with full overlap/time validation and derived Time Spent updates. Preserve task-copy confirmation, locked linked customer, existing status eligibility, stale revision protection and queued saves; report failure without losing draft.
- **CR-019**: Single-click Log Time table row selects; double click or keyboard Enter opens the existing Edit Dialog. Retain Edit/Delete controls, date group toggles, and event-isolation/focus behavior.
- Evidence: user explicitly chose **A**, matching existing Task Tracker edit semantics. Source inspection found `LogTime.tsx` currently has **no search bar**, requires explicit `Save Log Time` in Edit Dialog, and only exposes row `Edit` rather than Task Tracker's double-click row edit behavior. This is GitHub code inspection, not proof of a new Sites release.
- Safety: update **existing** React + D1 Site only, no legacy Express and no expected D1 schema change; preserve all original task/customer/log records, identifiers, sequence/revision, site URL and owner-only policy. Next: code, isolated D1 tests, CI, browser 1440/390 Light/Dark, implementation PR/merge, **separate Sites deployment and production read-only reconciliation**.

# Phase 2 — Log Time released as Sites Version 13 (2026-10-19, MYT)

**Status: F01–F06 IMPLEMENTED / TESTED / SELF-REVIEWED / MERGED / DEPLOYED / authenticated production browser verified.** This entry supersedes the blocked-publication records below; historical entries are retained.

- Existing Site: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/ ; same project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`. No replacement Site was created.
- Actual Sites **Version 13**; saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_94d39cf96d30819183352ac54faf2298`; deployment `appgdep_6ad59d9baa588191803d696c5115aa22` **succeeded** at **2026-10-19 12:33:58 MYT** (`2026-10-19T04:33:58.926591+00:00`), environment revision **0**.
- Sites source commit `aef6280137f1be557c4d999855921bcf559efce1`; native archive content hash `sha256:5836f7bd2a155b64877f68961fe6bc898f4498080a8d2539f826a24ed48c208d`. Local compressed deployment package SHA-256: `4245c24a0ef4f783233417cde3c6e69c88dad2fb22758ab58a368d13d89faf3e`. The official source workflow committed/pushed and packaged the source before the native owner-private deployment call.
- GitHub [PR #15](https://github.com/jaronhoh/Task-Tracker/pull/15) squash-merged as `f04fc6c471dd3e4fcfa3977ae4c2b5c8a40845a4`; exact tested head `f725cd4fccfb8a22d407477464d9eb88db12b3a5`. Sites and GitHub SHAs are distinct. All runtime/build/schema/migration source matches the merged GitHub mirror; a test file differs only in Windows line endings and a pre-existing Sites acceptance document was retained.
- F01–F05 delivered: workspace tabs; dated linked/custom Log Time CRUD; shared customers; searchable three-column task selection and filter-independent top Custom Task command; copy-on-select and locked linked customer; confirm/cancel reassociation; retained Closed/Deleted history; exact eleven Activities; Malaysia Today/This Week/All views, independent cards and compact date accordions; derived all-date Task Tracker Time Spent. Log Time never allocates a task number or writes copied details back to tasks.
- Server/D1 validation uses the existing atomic revision CAS: strict same-day HH:mm intervals, no overlap across any customer/task with adjacency allowed, real past/today Malaysia dates, active eligibility for new links, safe URLs, shared-customer reference guards and stale-editor protection. Existing task soft deletion is unchanged and retains historical task identity.
- **90 passed / 0 failed / 0 skipped** in final [CI 39198512654](https://github.com/jaronhoh/Task-Tracker/actions/runs/39198512654): 62 API/D1/weekly + 15 React/model + 13 real Chromium scenarios. TypeScript, React production build and full Sites/Vinext build passed; the production checkout was rebuilt successfully through the official build helper.
- Chromium test matrix: **1440px / 390px × Light/Dark**, including linked/custom CRUD, copied-field isolation, confirm/cancel task replacement, Closed-history corrections, reassignment/deletion aggregate changes, search/no-result actions, mobile fit and separate tab-bar geometry, plus all prior regression scenarios including Excel readback. Exact 1h Monday + 2h Tuesday = **3.00h**, overlap races, adjacency, invalid dates/URLs, customer guards, restart persistence and migration preservation were tested in isolated D1. No production CRUD acceptance writes.
- [Final CI browser/log artifact 12163231446](https://github.com/jaronhoh/Task-Tracker/actions/runs/39198512654/artifacts/12163231446), SHA-256 `1016b947c22f2dfb3770083fe9cefff1f476d0c1b55235439f277525b38bfcdd`. Implementing-agent self-review `5566837903` is not independent approval. An intermediate selector-scope failure was fixed before the final passing run; local Windows Excel-download cancellations were independently resolved by the successful full CI suite.
- **Production additive migration verified:** `0002_log_time.sql` creates only `log_time` and three indexes; applied 0000/0001 history is unchanged. Native live D1 now lists app_revision/app_sequence/customers/**log_time**/tasks; the new table has the expected 13 columns and **0 rows**. No seed/reset/reimport or task/customer rewrite occurred.
- **Complete production preservation:** full paginated row/column equality for **32 tasks, 6 customers, task_id next_value=33 and app_revision=164**, immediately before/after deployment and repeated after browser acceptance. No omitted columns or truncated cell values. Complete access policy remains owner-only custom, revision **1**, with identical user/group/editor fields. Runtime environment remains revision **0**, no entries; source hosting manifest, DB binding and URL are unchanged.
- **Authenticated live browser:** API Connected; actual new workspace and Time Spent column; all **32 unique task IDs** verified across 25 + 7 rows, including historical Closed tasks. Every task shows **0.00h**, correctly matching the legitimately empty production Log Time table. Total=0, Today=0.00h and This Week=0.00h across all three Log Time views. This verifies actual production aggregates without inserting test work.
- Live production checks at **1440px desktop / 390px mobile**, Light/Dark: new log dialog, current Malaysia Date, searchable task copy, linked-customer lock, exactly 11 Activities, no-result Custom Task command, keyboard Escape/cancel, tab navigation and no mobile page overflow. All dialogs were cancelled without saving. Six native production screenshots were saved in this task's outputs; viewport override was reset and original Light preference restored.
- Publication blocker resolved after the host enabled sandbox escalation. Official workflow then succeeded; a Windows packager path issue was handled through session-local Bash/TAR options without application or hosting changes. No credentials or raw production row data were published in release documentation.
- Rollback: redeploy saved Version 12 `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_0d0e3e5b0120819191f1beab4a317f8e`. Retain the additive table and any legitimate time logs; do not drop/reset it.

# Phase 2 — Log Time implemented and merged; Sites release NOT DONE (2026-10-19, MYT)

**Status: F01–F05 IMPLEMENTED / CI AND ISOLATED CHROMIUM PASSED / PR MERGED. F06 production publication and authenticated live acceptance remain BLOCKED / NOT DONE.** GitHub merge is not a Sites deployment. The actual existing Site remains **Version 12**.

- Implementation [PR #15](https://github.com/jaronhoh/Task-Tracker/pull/15) squash-merged to main as `f04fc6c471dd3e4fcfa3977ae4c2b5c8a40845a4`. Exact tested head: `f725cd4fccfb8a22d407477464d9eb88db12b3a5`. Only existing `sites/react-d1/` and its acceptance workflow changed; no legacy Express changes.
- Delivered: top-level Task Tracker / Log Time workspaces; independent Log Time CRUD and popup forms; shared customers; active-task three-column substring search and top, filter-independent one-off Custom Task command; copied editable details and locked linked customer; confirm/cancel before replacing edited details; retained Closed/Deleted historical links; exact 11 Activities; 24-hour HH:mm inputs; Malaysia dated Today/This Week/All views, independent Total/Today/This Week cards, compact date accordions and daily totals; derived all-date Task Tracker Time Spent.
- Validation is server-side inside the existing atomic D1 revision CAS: exact integer-minute duration, valid past/today calendar dates, strict same-date end > start, all-customer/task overlap exclusion with adjacency allowed, active eligibility for new links, safe HTTP(S) URLs, shared customer rename/delete integrity, and stale-editor protection. Task soft deletion is unchanged; it retains the task row and historical log links. No cascade or orphaning was introduced.
- New migration `0002_log_time.sql` only creates `log_time` and three indexes. Drizzle metadata and schema are included; `db:generate` reports no pending schema difference. Applied migrations 0000/0001 and snapshot 0000 remain unchanged. Isolated D1 migration test compares every legacy task/customer/sequence/revision field before/after and confirms an empty new table. **This migration has not run in production.**
- Final [CI run 39198512654](https://github.com/jaronhoh/Task-Tracker/actions/runs/39198512654) succeeded: **62 API/D1/weekly + 15 React/model + 13 real Chromium scenarios = 90 passed, 0 failed, 0 skipped**; TypeScript, React production build and full Sites/Vinext build succeeded.
- Chromium acceptance: **1440px desktop / 390px mobile × Light/Dark**, linked/custom CRUD, search/no-results command, copy-only edits, linked customer lock, confirm/cancel reassociation, retained times, Closed-history correction, linked→custom subtraction, delete, exact task totals, mobile fit and separate tab-bar geometry. Existing 9 Chromium regressions include keyboard behavior, task/customer mutations in isolated D1, themes, filters, pagination and Excel readback. Malaysia week/date boundaries and 1h Monday + 2h Tuesday = 3.00h are separately covered in model/API tests.
- [Final screenshot/log artifact 12163231446](https://github.com/jaronhoh/Task-Tracker/actions/runs/39198512654/artifacts/12163231446), SHA-256 `1016b947c22f2dfb3770083fe9cefff1f476d0c1b55235439f277525b38bfcdd`. Implementing-agent self-review recorded as review `5566837903`; this is not independent approval. An intermediate style revision failed legacy selectors that assumed one tab bar; selectors now explicitly scope Task views and new bars have their own geometry checks. Windows-local Excel downloads were cancelled, while the complete CI browser/export suite passed.
- Actual native Sites checks before/after: same project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, **Version 12**, URL https://task-tracker-jaron-migration.savoryboar128.chatgpt.site ; owner-only custom access policy **revision 1**, all users/groups/editor fields identical; runtime environment **revision 0**, no entries, unchanged; same `DB` binding. No new Site, source publication, saved version or deployment was created.
- Production read-only, fully paginated **full-row equality** for **32 tasks, 6 customers, app_sequence task_id next_value=33, app_revision=164**. No omitted columns or truncated values. **164 is this run's real baseline**, not the older release entry's 150. Current user tables remain app_revision/app_sequence/customers/tasks; no production log_time table exists. This is preservation across development, not a post-deployment migration reconciliation.
- Authenticated production baseline browser verification completed after the user signed in: API Connected; Show All Data has 32 records, with 25 + 7 rows across both pages, 32 unique IDs from TSK-0001 through TSK-0032, and historical Closed tasks readable. No Log Time workspace is present. This verifies the existing production baseline, not a Phase 2 deployment; no production CRUD was performed.
- **Release blockers:** Sites source synchronization is still blocked: the official source-helper credential input was retried after network permission was granted and rejected with `write_stdin rejected: approval required by policy ... sandbox_approval is false`. Browser authentication is now resolved. **Production Phase 2 publication, new version/source SHA/deployment ID and live Log Time aggregate verification remain NOT VERIFIED / NOT DONE.**
- Resume: obtain a usable existing-Sites source checkout, copy the exact merged React/D1 source, build/package and publish the **same** project through the official helper/native private publishing flow. Refresh the production full-row baseline immediately before publication; allow only additive migration 0002; verify new table initially empty, all legacy rows/sequence/revision/access/environment unchanged, and compare actual live task aggregates against live Log Time rows. No production CRUD test fixtures, reset or reimport. Complete authenticated live desktop/mobile acceptance, then append actual Sites source SHA, version, deployment ID/time and reconciliation here.
- Rollback plan for the future release: redeploy saved Version 12 (`appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_0d0e3e5b0120819191f1beab4a317f8e`). Leave the additive table/data in place; never drop it or erase any legitimate logs.

# Phase 2 PRD merged into main — Log Time (2026-10-19, MYT)

**GitHub verified:** User-approved Phase 2 Log Time PRD and status documentation merged to `main` via [PR #14](https://github.com/jaronhoh/Task-Tracker/pull/14), squash commit `c8fd723ed7997ce8fba7e55283507c7c21b5ed6f`. PRD: `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md`.

**Still not done:** Phase 2 React/API/D1 implementation, new schema migration, automated tests, browser acceptance, implementation PR/merge, Sites deploy, live verification and D1 full-row pre/post comparison. No direct Sites management/deployment interface was available in this ChatGPT session; **no claim of release**. Last evidenced production remains **Sites Version 12**. Preserve all records/IDs/URL/access policy; use the existing Site. Next implementation owner: authorized Work/Codex workflow; implement F01–F06, CI and additive migration checks, then separately deploy and record native Sites version/source/deployment evidence.

# Approved Phase 2 — Log Time PRD (2026-10-19, MYT)

**Status: USER-APPROVED REQUIREMENTS / PRD COMMITTED ON DOCUMENTATION BRANCH.** No Phase 2 implementation, test, merge, D1 migration or Sites deployment has been performed by this documentation update. **Last confirmed production release remains Sites Version 12** (2026-10-18), with the GitHub/Sites evidence detailed in the historical entry below.

- Dedicated PRD: `docs/PRD_PHASE2_LOG_TIME_2026-10-19.md`; branch `docs/phase2-log-time-prd-20261019` for documentation review/PR.
- Phase 2 Scope: top-level Task Tracker / Log Time tabs; separate dated Log Time CRUD, shared Customer, single-use Custom Task, eligible Task Tracker subjects (Work in Progress, Pending with Customer, KIV), closed historical log edit/delete, task-linked calculated Time Spent, fixed 11 Activity options, popup dialogs, compact date-grouped tables, Today/This Week/Show All Data, Total/Today/This Week dashboard cards.
- Copy-on-select: task title, customer (locked), task_description, note and tracker_link; edited copied fields belong only to Log Time. Relinking tracker tasks recopies after confirmation; converting to one-off custom retains copied fields/customer but unlocks Customer. Custom task never creates a Task Tracker task and its time is not counted in Tracker Time Spent.
- Time validation: Malaysia work Date required, past/today only, end > start on same Date, no overnight and no overlapping intervals for any customer/subject on that Date; adjacent permitted; enforce server-side transactionally.
- Engineering notes: new **additive D1 Log Time schema** expected; never rewrite/remove production tasks/customers or task ID sequence; preserve Sites URL/access. Open safeguards D001–D004 documented in PRD, including deletion/reference safety; do not infer deployment approval for irreversible migrations.
- Next: review/merge PRD documentation, implement in `sites/react-d1/`, run code/tests/real Chromium desktop+mobile × Light/Dark in isolated D1, verify production snapshot and safe migration, separately deploy existing Site and record verified release/version/SHA/deployment/data equality. GitHub merge **is not** Sites deployment.

# Latest release — CR-015 / CR-016, Sites Version 12 (2026-10-18)

**Status: IMPLEMENTED / TESTED / SELF-REVIEWED / MERGED / DEPLOYED / native production browser verified.** This entry supersedes the approved-next-requirements record below; historical entries are retained.

- Existing Site: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/ ; project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`.
- Sites Version **12**, saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_0d0e3e5b0120819191f1beab4a317f8e`.
- Deployment `appgdep_6ad49f3bf404819180ae68c79c17e9e0` **succeeded** at **2026-10-18 18:28:36 MYT** (`2026-10-18T10:28:36.960692+00:00`), environment revision **0**.
- Sites source SHA: `a2b6b1cb61dcd7107164405967f6fe5da177efdb`. Deployment archive content SHA-256: `c85edb71deec99ee0b6ddbc5019c34d5d22bafc9ab6370265ef7994195f00013`. Full React and Sites/Vinext builds passed before packaging.
- Requirements [PR #12](https://github.com/jaronhoh/Task-Tracker/pull/12) was verified open at continuation, then squash-merged as `a6cea3585e88e312e619fca23110145c7a350bd6`. Implementation [PR #13](https://github.com/jaronhoh/Task-Tracker/pull/13) squash-merged as `32d4271cab7467e338fcab69321c7654d07744b5`; tested head `2281cef89e93953bb28c18268f54c7c5461dd76e`. The four changed source/test files match Sites source byte-for-byte. GitHub and Sites SHAs are distinct.
- CR-015: every Weekly/Status customer badge shows a comfortably spaced `Customer | Count`, retaining color dots, exact filtered counts, Unassigned, ordering, one-line horizontal scrolling and collapsed visibility.
- CR-016: existing Customer, task Status, time-dialog Status, managed/add-customer Color and page-size selectors support instant case-insensitive substring search, clear/reset and no-results feedback. Color search includes HEX and RGB; swatches, stored values and unavailable-color guards remain. Keyword entry alone does not save. Arrow/Enter/Escape, focus return, click-away, touch and unsaved drafts work. Menus open upward when needed near a dialog's bottom edge.
- Existing task Customer dropdown's **Add Customer** stays in an independent footer for all queries, including zero matches. Existing page-level Manage Customers/New Task and manager Add Customer remain visible and usable; no new command entries were invented. Customer creation refreshes options and retains the unsaved task draft.
- Scope: only `sites/react-d1/` frontend/browser tests plus release documentation. No historical Express deployment, service/API/business-rule, dependency, hosting, D1/schema/migration, environment or access change.
- Validation: **14 React/model + 56 API/D1/weekly + 9 real Chromium scenarios = 79 passed, 0 failed**. TypeScript, React production build, full Sites/Vinext production build and whitespace checks passed. Final [CI run 39119187425](https://github.com/jaronhoh/Task-Tracker/actions/runs/39119187425) succeeded on the exact tested head.
- Real Chromium acceptance: **1440px / 390px × Light / Dark**, including search interior substrings/mixed case, reset/order, no-results, fixed footer customer creation/draft preservation, new/edit status save, keyword-only non-mutation, active-task close confirmation and time-dialog selection without premature save, HEX/RGB and disabled colors, viewport-fit geometry, keyboard/touch, page size and original tab/group/filter/export/validation/retry/delete regressions. **16 new CR-015/016 screenshots** plus prior release regression screenshots are in [artifact 12132873980](https://github.com/jaronhoh/Task-Tracker/actions/runs/39119187425/artifacts/12132873980); artifact SHA-256 `a736ffcb3f875d5f11f638f49c41fd8a53d1cba3dfee9e01088251bc1b1a3f28`.
- Review: implementing-agent self-review recorded on PR #13 (review ID **5562541714**), all four changed files and desktop/mobile Light/Dark screenshots inspected. This is not independent human approval. Visual inspection prompted bottom-edge menu positioning and a strict visibility assertion. Early local test failures were test locator/order/notification-removal issues and were corrected before final successful CI; no failed run was represented as acceptance.
- Native production browser: authenticated live URL, actual viewport **1294×840**; Light/Dark, all four real Status group counts against actual task rows, collapsed summary visibility, customer substring search, zero results/fixed Add Customer, new-task status filtering, RGB color filtering, manager Add Customer visibility, TSK-0002 search and keyword-only existing-task editor checked. Production screenshot is native desktop; the exact 1440/390 matrix ran in Chromium before deployment. No production CRUD was performed.
- Actual production groups: **WIP 17 = JXM 10 + VSTECS 5 + MySelf 2; Pending 1 = MMM 1; KIV 3 = VSTECS 3; Closed 4 = JXM 3 + MySelf 1**. Search TSK-0002 produces only KIV / VSTECS **1**. Counts come from data, not hard-coded PRD examples.
- Production preservation: complete paginated full-row **before/after equality**, repeated after native browser verification, for **32 tasks, 6 customers, app_sequence task_id next_value=33, app_revision=150 including its token**. All columns/rows included and no truncated values. Revision **150** was already present in this run's pre-release baseline; do not substitute the older Version 11 release note's revision 149. Complete access policy unchanged: owner-only custom audience, revision **1**; environment entries/revision **0** unchanged; same project, URL, D1 DB and manifest. No seed/reset/migration/sequence allocation or production test writes.
- Evidence: [release evidence](evidence/cr015-cr016-v12/README.md), native production screenshots, group-count JSON and preservation summary. Deployment confirmation, GitHub merge/CI and production verification were checked separately.
- Rollback: redeploy saved Version **11** (`appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_d89ad357944081918d32ce35b1880506`); no D1 rollback/migration is required for this frontend release.

# Approved next requirements — CR-015 / CR-016 (2026-10-18, MYT)

- **Status: USER APPROVED / PRD UPDATED ON FEATURE BRANCH; implementation, tests, merge and Sites deployment NOT performed by this documentation change.** Latest recorded production remains **Sites Version 11** (2026-10-17). Version 12 is a proposed release target, not a deployed version.
- PRD: `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md` §9 (CR-015, CR-016); branch `docs/cr015-cr016-dropdown-search-20261018` pending PR and merge.
- CR-015: display spaced `Customer Name | Count` in all Accordion group customer badges; preserve customer color dots, counts, one-line scrolling and collapse/filter behavior.
- CR-016: all existing data-selection dropdowns get instantaneous case-insensitive substring keyword filtering, clear/reset and no-results feedback, with keyboard/touch and theme support. Existing Add Customer, Manage Customers and Add Data/New Task actions remain independent, visible and fully functional even when no option matches; no new actions are invented.
- Scope: Sites React presentation and tests only; no D1/schema, business rules, production data, ID sequence/revision, access, or Site URL changes authorized.
- Next: implement approved PRD, test real Chromium desktop/mobile in both themes plus existing regressions, review/merge, separately deploy existing Sites project after safety checks, verify production and append deployment evidence here.

# Latest release — CR-013 / CR-014, Sites Version 11 (2026-10-17)

**Status: IMPLEMENTED / TESTED / REVIEWED / MERGED / DEPLOYED / production browser verified.**

- Existing Site: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/
- Sites Version **11**, project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`.
- Sites **Source Commit: `26653c37071a4641473495f4fa8928bae2ee67fe`**.
- Saved version: `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_d89ad357944081918d32ce35b1880506`.
- Deployment: `appgdep_6ad3238ddc308191900f5df43ec309c2`, **succeeded**, 2026-10-17 **15:28:41 MYT** / `2026-10-17T07:28:41.030702+00:00`, environment revision **0**.
- GitHub implementation [PR #10](https://github.com/jaronhoh/Task-Tracker/pull/10), squash-merged into main as `aaef4770335b6c5424fd367a52856dbbc994c77a`; tested PR head `222457dc12bab24190aa808f7bd2991109bdc010`. GitHub and Sites commits are distinct. Code mirror: `sites/react-d1/`.
- CR-013: full-width gray TabsList divider removed in both themes; active-tab short blue underline, focus indication, tab navigation and filters retained.
- CR-014: every grouped header shows its existing label/total and customer-name/task-count badges on **one non-wrapping row**, including while collapsed. Counts use that exact group's filtered task collection, sort by count then name, retain existing customer color dots, and include an Unassigned bucket for unresolved customers. Only nonzero buckets display. The summary scrolls independently by pointer/touch/keyboard within the visible table viewport; toggle remains visible.
- Scope: only React frontend and its tests changed. No API, business eligibility, export, pagination, schema/migration, dependency, hosting, environment, access or production D1 writes.
- Automated results: **14 React/model + 56 API/D1/weekly + 8 real Chromium scenarios = 78 passed, 0 failed**. Frontend TypeScript, React production build, full Sites/Vinext build and whitespace checks passed.
- Browser gate: [CI 39013525276](https://github.com/jaronhoh/Task-Tracker/actions/runs/39013525276), success. Real Chromium tested **1440px / 390px × Light / Dark**, Weekly/Status headers, per-customer counts against actual rows, Unassigned conservation, overflow/one-line geometry, ArrowRight scrolling, Enter/Space collapse/expand, tab keyboard navigation, search, status filters, no-results, refreshed data and existing UI regressions. **16 CR-013/014 screenshots** generated, plus existing regression screenshots.
- First CI run 39013384982 was **7 browser pass / 1 fail**, not acceptance. The new test read a tab's intermediate animated border color. It now waits for the final computed color while retaining the strict assertion; product code was unchanged by that test-only correction.
- Review: implementing-agent self-review submitted on PR #10 (review ID 5556835689); all five changed files and Light/Dark desktop/mobile screenshots inspected. This is not represented as independent human approval.
- Production real browser after deployment: existing authenticated page loaded Version 11; divider computed **0px**, active underline retained; four status groups matched exact task IDs and customer totals. Collapse preserves summaries; Enter/Space works; search TSK-0002 gives only KIV/VSTECS **1**; each status card and repeated-click reset, Weekly (25 Carry Over / 0 New This Week), keyboard tab switching and All Data verified. Native production screenshots are desktop; the exact 1440/390 theme matrix was executed in Chromium CI before deployment.
- Actual production status counts at verification: **WIP 17 = JXM 10 + VSTECS 5 + MySelf 2; Pending 1 = MMM 1; KIV 3 = VSTECS 3; Closed 4 = JXM 3 + MySelf 1**. PRD examples are not hard-coded.
- Production preservation: complete paginated read-only **before/after full-row equality** for **32 tasks, 6 customers, app_sequence next_value=33 and app_revision=149** (including its token). No omitted rows/columns or truncated values. Entire access_policy unchanged, owner-only custom audience revision 1. Same project, URL, D1 binding and configuration. No production test CRUD, migration, seed, reset or sequence allocation.
- Evidence: committed screenshots/log under [docs/evidence/cr013-cr014-v11](evidence/cr013-cr014-v11/README.md), including 4 desktop/mobile Light/Dark collapsed views, Version 10 baseline, Version 11 production Light/Dark and production interaction JSON. Full [CI artifact 12093917062](https://github.com/jaronhoh/Task-Tracker/actions/runs/39013525276/artifacts/12093917062), SHA-256 `c60dd712ca39847a4704e231be07aa2a1b047c73f394e2616b385d7ee6e4f92c`.
- Rollback: redeploy saved Version 10 if required; no D1 rollback/migration is needed for this frontend-only release.
- Source of completion: GitHub merge **and** successful native Sites deployment **and** live production browser verification; GitHub update alone was not treated as deployment.

# Latest release — CR-012 Light / Dark Mode, Sites Version 10 (2026-10-17)

**Development Status: ACCEPTED / MERGED / DEPLOYED / production browser verified.** This entry supersedes the implementation-pending CR-012 record below.

- **GitHub PR / Merge Commit:** [PR #8](https://github.com/jaronhoh/Task-Tracker/pull/8), squash-merged as `88159c7f015bdf2147647e70386326c650ea3947`. Tested PR head `a2229318a7c0f4cd73e2ae9d8504385e9f15c982`. Author code review recorded with no blocking findings; this is not an independent reviewer approval.
- **Change Log:** top-right lucide Moon in Light Mode / Sun in Dark Mode; immediate theme switch; local preference persistence; first-paint system-theme initialization; system changes followed until explicit selection; cross-tab synchronization; graceful storage-denial handling. Shared semantic CSS variables cover navigation, summary cards, table/accordions, New/Edit Task, Manage Customers, native and custom dropdowns, dialogs, status badges, validation and transient Alerts. Customer color values remain data-driven and unchanged.
- **Automated Test Results:** 56/56 API/D1/weekly regressions, 13/13 React model/render tests, 7/7 Chromium scenarios passed locally and in [CI run 39011479067](https://github.com/jaronhoh/Task-Tracker/actions/runs/39011479067). TypeScript, React production build and full local Sites/Vinext production build passed. CI uses pipefail and logs explicitly report zero failures/skips. Browser mutations use isolated local D1 only.
- **Browser Acceptance Results:** real Chromium at **1440px and 390px**, both themes: correct icons and labels, click/Enter/Space, both transitions, refresh/revisit, first system preference and live OS changes, explicit preference precedence, cross-tab unsaved draft retention, unavailable localStorage, unchanged swatch RGB, no horizontal page overflow, all three views, New/Edit Task, customer/color dropdowns, form validation, success/error Alerts. Existing create/edit/retry/delete protection, sort/pagination, accordion/card filtering and Excel readback scenarios also passed. Screenshots visually inspected.
- **Browser evidence:** [CI screenshot/log artifact 12092778973](https://github.com/jaronhoh/Task-Tracker/actions/runs/39011479067/artifacts/12092778973), 45 files, archive SHA-256 `e09a7a823d51d3c1cc827fa52d5cc6136518417e27c4d73a8e5b653adce5484c`.
- **Sites Deployment Version:** **10**, saved version `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979~appgver_df48dd055c90819190afc14fffe3e2f6`. Deployment `appgdep_6ad31bb247748191ab7ba31732a25fd3` **succeeded** at **2026-10-17 14:55:10 MYT** (`2026-10-17T06:55:10.924420Z`); environment revision **0**.
- **Sites Source Commit:** `2346734450240bcab70a3a4845b157b64c2ce174`. All seven changed source/test files verified byte-for-byte against merged GitHub source before publication. Sites source commit and GitHub merge commit are distinct; documentation written after deployment is not part of the immutable deployed source.
- **Production browser:** actual deployed URL opened in authenticated browser; desktop 1440px confirmed Moon/Sun, Light→Dark→Light, dark and light persistence after reload, API Connected and weekly counts 25/25/0. Mobile 390px confirmed top-right toggle within viewport, both palettes, no page overflow and Manage Customers/color dropdowns. Opened New Task/customer dropdown and existing TSK-0002 editor without edits. Search TSK-0002, selected row and counts 1/1/0 remained intact across theme switch. No production CRUD performed. Native production screenshots retained in the task deliverables; transient notification/error and mutation regressions were exercised only in isolated D1.
- **Production Data Verification:** before/after read-only paginated full-row comparison found **32 tasks, 6 customers, app_revision 149 (including token), app_sequence task_id next_value 33** exactly identical in every field. No omitted/truncated rows, columns or values. No schema/migration, task allocation, import, reset or production write used for acceptance.
- **Configuration / access:** same project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, D1 `DB`, URL [Task Tracker](https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/), environment and complete custom owner-only access policy (revision 1). No new Site, dependency, service/API/business rule or schema change.
- **Evidence distinction:** GitHub CI verified; Sites native deployment/version/source verified; local real Chromium visual/interaction acceptance verified; native production browser verified; full-row production read-only comparison verified. GitHub merge alone was not treated as deployment.

## Historical CR-012 approval and earlier releases

## Approved next requirement — CR-012 Light/Dark theme (2026-10-17)

- **PRD:** `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md` §7.
- Top-right Sun/Moon toggle; instantaneous theme switch; manual preference persists locally, otherwise follow OS theme.
- Theme all Sites React views including tables, cards, task forms, Manage Customers, dropdowns, dialogs and transient alerts; preserve customer colors and accessibility.
- **Status: PRD committed to GitHub; code, browser tests and Sites deployment NOT started by this change.**
- **Production baseline: Version 9**. Next: implement in `sites/react-d1/`, synchronize GitHub and existing Sites source, perform desktop/mobile browser acceptance, deploy existing Site and update handoff with evidence.

# Latest release — CR-009–CR-011, Sites Version 9 (2026-10-16)

**Status: deployed and verified on the existing Task Tracker Site.** This release supersedes the earlier “implementation pending” follow-up entry below.

- Existing production Site: [Task Tracker](https://task-tracker-jaron-migration.savoryboar128.chatgpt.site/), project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`; deployed Version **9**. Deployment `appgdep_6ad24bdd4f708191a8baedeec79fd0f6` succeeded; version `appgver_244551bc2ebc8191a65efa983d408b5f`. Existing URL, D1 `DB` binding, owner-only custom access policy and access revision 1 retained.
- Sites source commit: `9bb52d0d362cf3a195307947f798cc64d5cc60d7`. React/D1 source synchronized under GitHub `sites/react-d1/`; latest GitHub main commit at browser acceptance: `77f6a760b9000a17136cd69a7f0de35be5613da4`.
- CR-009: shadcn/ui Alert-style transient notifications stack at bottom-right, announce through a live region and auto-dismiss independently after 5 seconds.
- CR-010: Manage Customers can add a customer with a selectable available color; successful addition refreshes the customer list and task customer selector.
- CR-011: customer name, color and Delete controls align on the same desktop row and fit mobile; D1 transactional task-reference delete guard remains enforced.
- Automated validation: **56/56 API/D1 tests**, React TypeScript check and production build passed; Playwright Chromium UI suite passed, including CR-009–CR-011 flows and referenced/unused customer deletion on **1440px desktop and 390px mobile**. CI: [run 38929017993](https://github.com/jaronhoh/Task-Tracker/actions/runs/38929017993), head `77f6a760b9000a17136cd69a7f0de35be5613da4`, success. Browser evidence artifact: [sites-browser-evidence](https://github.com/jaronhoh/Task-Tracker/actions/runs/38929017993/artifacts/12058007558).
- Production browser: opened the live Version 9 site, confirmed API Connected and inspected Manage Customers with Add Customer and inline Delete controls in the desktop layout.
- Production data: pre/post read-only full-row comparison identical for tasks (32), customers (6), `app_revision` (148), and `app_sequence.task_id.next_value` (33). No production CRUD, sequence allocation or schema change was used for acceptance.
- Status sources: **Sites deployment metadata verified / GitHub CI and browser evidence verified / production browser inspected / production D1 read-only equality verified**.

## Previous handoff

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
- **Status:** implemented and deployed to the existing Sites production as Version 8 (2026-10-16); automated checks passed. Real-browser acceptance was skipped with the user's explicit authorization; see release evidence below.
- **Production baseline:** Version 7 was the baseline; Version 8 is now the latest deployed release. GitHub and Sites source commits are recorded separately below.
- **Next:** complete desktop/mobile visual acceptance in a supported browser environment when available, and address any user-reported issues.

## Newly approved follow-up — Alerts and Manage Customers UI (2026-10-16)

**PRD:** `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md` §6, CR-009–CR-011. **Status: requirements recorded on GitHub; Sites implementation, browser QA and deployment pending.**
- CR-009: transient messages use shadcn/ui Base Alert appearance, float at bottom-right, auto-dismiss after 5 seconds; confirmations are excluded.
- CR-010: Add Customer action inside Manage Customers; update list and task customer selectors after successful creation.
- CR-011: Delete button aligned on the same desktop row as its customer field; retain transactional backend reference guard.
- Baseline is **Sites Version 8**, already deployed (browser visual acceptance was skipped with user authorization). Preserve Sites/D1 and existing production data.
- Next: implement/test in `sites/react-d1/` and existing Sites source, perform desktop/mobile browser QA, deploy existing Site, update GitHub handoff with real evidence.

## Current status — Version 8 deployed

**UI correction is accepted and deployed to the existing Site as Version 7 (2026-10-16 15:46:40 MYT).** Line tabs, Weekly/Status card filters and accordion defaults passed browser acceptance. See the latest release entry for exact evidence and provenance.

| Item | Verified result |
| --- | --- |
| Production | Version 8; deployment succeeded on 2026-10-16 |
| Sites Source Commit | `b0f386c3cd9d4eaaf2c00ccf949db443709f30cc` |
| GitHub source | PR #7 squash-merged into `main` as `09dc9b4e94f0eecbbb702958881d4d6cfdec0bf4`; React/D1 source is in `sites/react-d1/` |
| Automated tests | API/D1/weekly 55/55; React model/render 13/13; TypeScript and Sites/Vinext build passed |
| Visual/browser acceptance | Not performed. User explicitly authorized skipping it to deploy; Playwright Chromium was unavailable and managed preview could not connect |
| Production data | 32 tasks and all pre-existing fields unchanged; 6 customers unchanged; sequence next=33; revision=144 unchanged; new nullable `tracker_link` is null for existing tasks |
| URL/access | Existing URL, project ID, D1 binding, configuration and owner-only access policy preserved |

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


### 2026-10-16 — Task form and customer management candidate (not deployed)
- Branch: `feat/task-form-customer-20261016`; based on the current `main` commit `38f5e6bded3b646400bed1935cf40e4bb2d00b67`.
- Existing Sites baseline: Version 7, project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`, source commit `e54f6d43a7533e4be5b3280f0acb365d5cdeb94d`; URL and access unchanged.
- Candidate source changes: optional Tracker Link with HTTP/HTTPS validation and safe table link; Status/Created/End same desktop row; server-side transactional Customer reference check and delete; accessible customer/color selectors showing swatches and HEX; nullable additive `tracker_link` D1 migration. No existing data, ID, revision, sequence, business rules, or export fields changed.
- Automated checks: React model/render tests **13/13 passed**; API/D1/weekly tests **55/55 passed**; frontend TypeScript, Sites/Vinext build, and diff checks passed. Playwright browser test source was added and syntax-checked but **not executed**.
- Browser acceptance: **BLOCKED**. Sites preview on `http://terminal.local:4173/` repeatedly returned `ERR_CONNECTION_REFUSED`; preview start reports a Vinext dev server under `/site` holding PID 63 on port 4173, which is outside this checkout and was not terminated. Local Playwright Chromium is absent. No desktop/mobile screenshots or visual acceptance are available.
- Release gate: no Sites source push, saved version, D1 migration, production data mutation, or deployment was performed. Production remains Version 7. The browser-before-deploy requirement is still pending; do not merge/deploy until browser acceptance runs on desktop and mobile and data/config preservation is checked.
- Sources: GitHub branch content and local tests verified; Sites metadata and preview error verified; browser acceptance and deployment not verified.


### 2026-10-16 — Task form/customer enhancement deployed as Version 8
- Site: existing project `appgprj_6ad0f51ede5c8191bb6ab29c1b9b8979`; production URL unchanged: https://task-tracker-jaron-migration.savoryboar128.chatgpt.site
- Deployment: **succeeded**, Version **8**, Sites source commit `b0f386c3cd9d4eaaf2c00ccf949db443709f30cc`.
- GitHub sync: PR #7 squash-merged into `main` as `09dc9b4e94f0eecbbb702958881d4d6cfdec0bf4`. All 12 application files were verified byte-for-byte against the Sites source checkout before merge.
- Delivered: safe HTTP/HTTPS Tracker Link entry and link icon; desktop form lifecycle row; customer deletion guard enforced transactionally in D1; visible customer color swatches and HEX code; additive nullable `tasks.tracker_link` migration.
- Automated validation: API/D1/weekly **55/55 passed**; React model/render **13/13 passed**; TypeScript and production build passed. Chromium UI suite and real-browser desktop/mobile acceptance were skipped under the user's explicit authorization because Chromium was unavailable and Sites preview returned `ERR_CONNECTION_REFUSED`.
- Production preservation: read-only before/after comparison confirmed 32 tasks, 6 customers, every existing Task field, customer row, `app_sequence` (next value 33), and `app_revision` (144) unchanged. The new `tracker_link` column is null for all existing tasks. URL, D1 binding, environment configuration and owner-only access policy were preserved.

### 2026-10-16 — Follow-up UI requirements CR-009–CR-011 (GitHub verified)
- User requested shadcn/ui Alert-styled bottom-right notifications that disappear after 5 seconds, Add Customer inside Manage Customers, and same-row Delete buttons.
- Updated `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md` §6 with acceptance criteria, mobile/accessibility and safety constraints.
- Documentation-only GitHub update; **no new Sites implementation, testing, deployment or production data changes**. Version 8 remains latest deployed baseline.

### 2026-10-17 — CR-012 theme toggle PRD (GitHub verified)
- User requested Dark Mode / Light Mode selection at top-right using Moon/Sun icons.
- Added CR-012 and acceptance criteria to `docs/PRD_TASK_FORM_CUSTOMER_MANAGEMENT_2026-10-16.md`.
- Documentation only; no Sites code, data, tests, configuration or deployment changed. Latest deployed baseline remains Version 9.

### 2026-10-17 — CR-013/014 UI requirements (GitHub verified)
- User screenshot shows unwanted full-width line beneath TabsList and requests customer-name/task-count breakdown within each Accordion header.
- Updated PRD §8 with exact scope, counting rules, accessibility and acceptance criteria.
- Documentation-only change; Sites Version 10 remains production baseline; no React implementation or deployment performed by this update.
