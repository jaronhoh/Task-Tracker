# CR-015 / CR-016 — Version 12 evidence

Released on the existing owner-private Task Tracker Site, 2026-10-18 18:28:36 MYT. See [PROJECT_STATUS.md](../../PROJECT_STATUS.md) for the immutable source, saved-version and deployment identifiers.

## Reproducible acceptance

[Successful CI run](https://github.com/jaronhoh/Task-Tracker/actions/runs/39119187425) on `2281cef89e93953bb28c18268f54c7c5461dd76e`: 14 model + 56 API/D1/weekly + 9 real Chromium scenarios, all passed. [Download the browser screenshots and log](https://github.com/jaronhoh/Task-Tracker/actions/runs/39119187425/artifacts/12132873980), SHA-256 `a736ffcb3f875d5f11f638f49c41fd8a53d1cba3dfee9e01088251bc1b1a3f28`. Includes 16 CR-015/016 screenshots across 1440/390px and Light/Dark plus original regression screenshots. Fixture mutations are isolated to local D1. Local API/model and final focused acceptance logs are retained alongside this file; CI is the final full-suite gate.

## Native production verification

Authenticated production browser, actual desktop viewport 1294×840. Exact desktop/mobile acceptance matrix is the Chromium CI evidence above. No production CRUD performed. Opened new-task and existing-task editors for keyword-only checks, leaving saved values untouched; exercised no production create/save/delete buttons.

- [Group summaries, collapsed, Light](production-v12.png)
- [Customer no-results with retained Add Customer footer, Light](production-v12-search-light.png)
- [RGB color filtering with original swatch, Dark](production-v12-colors-dark.png)
- [Exact badges compared against visible task rows](production-groups.json)
- [Complete paginated before/after preservation summary](preservation.json)

Native checks also confirmed new-task Status substring search, manager Add Customer visibility during color filtering, search TSK-0002 -> VSTECS | 1 and existing-editor keyword-only non-mutation. The full-row preservation check was repeated after these interactions; all 32 tasks, 6 customers, sequence 33 and revision 150 (including token) were identical to the pre-release baseline. Raw production row data and credentials are not included in these public-facing reports.
