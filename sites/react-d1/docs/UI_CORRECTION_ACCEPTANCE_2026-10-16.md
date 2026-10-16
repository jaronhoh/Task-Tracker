# Sites UI correction — browser acceptance

The earlier candidate report is historical. Browser access was subsequently established through the available native cloud-browser API and the existing private Site's normal ChatGPT login flow. No credentials were exposed in source, logs or artifacts.

## Root cause verified on actual production Version 6

Native browser screenshot and computed DOM styles showed all three tab triggers had `1px solid rgb(229,229,229)` borders. The unlayered universal border-color declaration overrides layered Tailwind border-transparent. Weekly summary cards had no buttons; New This Week count 0 was expanded. Selecting Work in Progress showed 17 rows; selecting it again still showed 17 with pressed=true, confirming the missing re-click reset.

## Candidate verification before publication

- GitHub Actions run 38868869142, head 6a259460bfd5d32199837ab3894e8384eecfa84c: 13 React tests, 53 API/D1/weekly tests and all 4 Chromium browser scenarios passed. Frontend TypeScript and production React build passed.
- Browser acceptance: desktop 1440px and mobile 390px; 3 Weekly cards and 5 Status cards checked against exact displayed task IDs. Re-click resets, stable pre-filter counts, zero-count card, empty search, tab switching and one-line tabs covered.
- Independent accordion pointer + Enter/Space toggles; default populated-open/empty-closed; search context resets covered.
- Row keyboard editing, editor close, sorting/pagination, save/retry, customer update, logical delete/restore in isolated local D1, and XLSX readback covered. No production writes used.
- Computed style assertions verify zero top/left/right tab borders, transparent backgrounds and blue active bottom border. Keyboard focus outline remains intentionally visible.
- Six screenshots (weekly/status/all status at both sizes) downloaded and visually inspected; line tabs, selected cards, readable mobile wrapping and horizontal table/tab scrolling accepted.
- Evidence artifact 12032520575, SHA-256 b2840d856dedc8e31c88c3324d7f365e5405d1d7c3f874a18fde5cd107674b78.
- Screenshot and browser log artifact: https://github.com/jaronhoh/Task-Tracker/actions/runs/38868869142/artifacts/12032520575

## Test infrastructure corrections

Managed preview reported running but refused connections; local Playwright lacked its Chromium executable. Candidate browser tests therefore ran in isolated GitHub Actions, not against production. Initial runs 38868591837 and 38868722290 had 3 passing/1 failing browser tests despite a successful job due to tee swallowing the failure status; those runs are NOT accepted. Explicit bash enables pipefail. Keyboard tab verification now uses actual tab activation and awaits the selected state; the later test revision also waits for editor focus restoration. No app behavior was weakened to pass a test.

## Production preservation gate

Read-only, fully paginated DB snapshot before publication: 32 tasks, 6 customers, app_sequence task_id next_value=33, one app_revision row; no truncated columns/rows/values. Existing project ID, D1 DB binding, migrations, API/server code, dependencies, runtime environment and access remain unchanged in the candidate. Post-deploy exact full-row and access-policy comparison plus native browser smoke acceptance are required and recorded in GitHub PROJECT_STATUS.md after deployment.

## Export scope

Weekly/status exports include all tasks in selected groups after search/card filtering, even if an accordion is collapsed. All-data export retains full filtered sorted records across pages. Test reads back the generated workbook to verify scope.


## Publication result

Accepted and deployed as Version 7 at 2026-10-16 15:46:40 MYT, source e54f6d43a7533e4be5b3280f0acb365d5cdeb94d. Final CI run 38869014957 on 097cfcc8d90ffb35fb67255bbab9ec13a61efbf9 passed 70 tests. Native production browser filters, exact task IDs, repeated-click reset, keyboard accordions, search and opening/dismissing the editor passed. Production full-row data and access policy are identical. See root docs/PROJECT_STATUS.md for exact deployment IDs and evidence.
